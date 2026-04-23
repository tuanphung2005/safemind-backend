import { env } from "../../config/env";
import { AppError } from "../../shared/http/errors";
import { sanitizeText } from "../../shared/safety/content-filter";
import {
  buildEmotionUserPrompt,
  buildScenarioUserPrompt,
  emotionSystemPrompt,
  scenarioSystemPrompt,
} from "./gemini.prompts";
import type {
  EmotionReflectionRequest,
  EmotionReflectionResult,
  ScenarioDraft,
  ScenarioChoiceDraft,
  ScenarioGenerationRequest,
} from "./gemini.types";

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

const extractJsonBlock = (text: string): string => {
  const cleaned = text.trim();

  if (cleaned.startsWith("[") || cleaned.startsWith("{")) {
    return cleaned;
  }

  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  const firstIndex =
    firstBrace === -1
      ? firstBracket
      : firstBracket === -1
        ? firstBrace
        : Math.min(firstBrace, firstBracket);

  if (firstIndex === -1) {
    throw new AppError("AI_UNAVAILABLE", "AI did not return JSON format", 503);
  }

  return cleaned.slice(firstIndex).trim();
};

const parseJson = <T>(text: string): T => {
  const candidate = extractJsonBlock(text)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(candidate) as T;
};

const validateReflection = (payload: unknown): EmotionReflectionResult => {
  const fallback: EmotionReflectionResult = {
    reflection: "Cảm ơn bạn đã chia sẻ. Bạn đang làm rất tốt khi nói ra cảm xúc của mình.",
    microAction: "Hãy hít vào 5 lần thật chậm và uống một chút nước.",
  };

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;

  return {
    reflection:
      typeof record.reflection === "string"
        ? sanitizeText(record.reflection, 220)
        : fallback.reflection,
    microAction:
      typeof record.microAction === "string"
        ? sanitizeText(record.microAction, 120)
        : fallback.microAction,
  };
};

const validateScenarioList = (payload: unknown): ScenarioDraft[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const title =
        typeof record.title === "string" ? sanitizeText(record.title, 120) : "";
      const description =
        typeof record.description === "string"
          ? sanitizeText(record.description, 240)
          : "";

      const rawChoices = Array.isArray(record.choices) ? record.choices : [];
      const choices = rawChoices
        .map((choice) => {
          if (!choice || typeof choice !== "object") {
            return null;
          }

          const choiceRecord = choice as Record<string, unknown>;
          const role =
            choiceRecord.role === "supporter" ||
              choiceRecord.role === "bystander" ||
              choiceRecord.role === "defender"
              ? choiceRecord.role
              : null;

          if (!role) {
            return null;
          }

          const safeRole: ScenarioChoiceDraft["role"] = role;

          const text =
            typeof choiceRecord.text === "string"
              ? sanitizeText(choiceRecord.text, 140)
              : "";
          const feedback =
            typeof choiceRecord.feedback === "string"
              ? sanitizeText(choiceRecord.feedback, 220)
              : "";

          if (!text || !feedback) {
            return null;
          }

          return {
            text,
            role: safeRole,
            feedback,
          };
        })
        .filter((choice): choice is NonNullable<typeof choice> => Boolean(choice));

      if (!title || !description || choices.length < 3) {
        return null;
      }

      return {
        title,
        description,
        choices,
      };
    })
    .filter((scenario): scenario is NonNullable<typeof scenario> => Boolean(scenario));
};

class GeminiClient {
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor() {
    this.apiKey = env.geminiApiKey;
    this.model = env.geminiModel;
    this.timeoutMs = env.geminiTimeoutMs;
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  private async generateRawText(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new AppError("AI_UNAVAILABLE", "Gemini API key is missing", 503);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: userPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 800,
            },
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const reason = await response.text();
        throw new AppError(
          "AI_UNAVAILABLE",
          `Gemini request failed: ${response.status}`,
          503,
          reason
        );
      }

      const payload = (await response.json()) as GeminiApiResponse;
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new AppError("AI_UNAVAILABLE", "Gemini returned empty content", 503);
      }

      return text;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError("AI_TIMEOUT", "Gemini request timed out", 504);
      }

      throw new AppError("AI_UNAVAILABLE", "Gemini request failed", 503, error);
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateEmotionReflection(
    payload: EmotionReflectionRequest
  ): Promise<EmotionReflectionResult> {
    const raw = await this.generateRawText(
      emotionSystemPrompt,
      buildEmotionUserPrompt(payload)
    );

    const parsed = parseJson<Record<string, unknown>>(raw);
    return validateReflection(parsed);
  }

  async generateGameScenarios(
    payload: ScenarioGenerationRequest
  ): Promise<ScenarioDraft[]> {
    const raw = await this.generateRawText(
      scenarioSystemPrompt,
      buildScenarioUserPrompt(payload)
    );

    const parsed = parseJson<unknown>(raw);
    return validateScenarioList(parsed);
  }
}

export const geminiClient = new GeminiClient();
