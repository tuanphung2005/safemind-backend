import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { geminiClient } from "../src/integrations/gemini/gemini.client";
import { AppError } from "../src/shared/http/errors";

describe("Gemini client format contract", () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = (geminiClient as any).apiKey;

  const mockGeminiText = (text: string, status = 200) => {
    (globalThis as any).fetch = async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text }],
              },
            },
          ],
        }),
        {
          status,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
  };

  beforeEach(() => {
    (geminiClient as any).apiKey = "test-key";
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
    (geminiClient as any).apiKey = originalApiKey;
  });

  it("parses emotion reflection JSON format from markdown code block", async () => {
    mockGeminiText(
      "```json\n{\"reflection\":\"Bạn đang làm rất tốt khi chia sẻ.\",\"microAction\":\"Hít sâu 5 lần rồi uống nước.\"}\n```"
    );

    const result = await geminiClient.generateEmotionReflection({
      emotion: "sad",
      reasons: ["bị điểm thấp"],
      customReason: "Mình buồn vì chưa làm tốt",
    });

    expect(typeof result.reflection).toBe("string");
    expect(typeof result.microAction).toBe("string");
    expect(result.reflection.length).toBeGreaterThan(0);
    expect(result.microAction.length).toBeGreaterThan(0);
    expect(result.reflection.length).toBeLessThanOrEqual(220);
    expect(result.microAction.length).toBeLessThanOrEqual(120);
  });

  it("falls back to safe reflection shape when AI fields are missing", async () => {
    mockGeminiText('{"unexpected":"value"}');

    const result = await geminiClient.generateEmotionReflection({
      emotion: "angry",
      reasons: ["bị trêu"],
    });

    expect(result.reflection).toContain("Cảm ơn bạn đã chia sẻ");
    expect(result.microAction).toContain("Hãy hít vào");
  });

  it("sanitizes oversized AI reflection output to max lengths", async () => {
    const longText = "a".repeat(800);
    mockGeminiText(`{"reflection":"${longText}","microAction":"${longText}"}`);

    const result = await geminiClient.generateEmotionReflection({
      emotion: "neutral",
      reasons: [],
    });

    expect(result.reflection.length).toBeLessThanOrEqual(220);
    expect(result.microAction.length).toBeLessThanOrEqual(120);
  });

  it("parses scenario list and keeps valid role values only", async () => {
    mockGeminiText(
      '[{"title":"Tình huống A","description":"Bạn thấy bạn bị trêu","choices":[{"text":"Cười theo","role":"supporter","feedback":"Điều này làm bạn kia buồn hơn"},{"text":"Im lặng","role":"bystander","feedback":"Im lặng có thể làm tình huống tệ hơn"},{"text":"Can ngăn","role":"defender","feedback":"Bạn đã giúp tình huống an toàn hơn"}]}]'
    );

    const scenarios = await geminiClient.generateGameScenarios({ count: 1 });

    expect(scenarios.length).toBe(1);
    expect(scenarios[0].choices.length).toBe(3);
    expect(scenarios[0].choices.map((choice) => choice.role)).toEqual([
      "supporter",
      "bystander",
      "defender",
    ]);
  });

  it("drops malformed scenarios that do not meet required shape", async () => {
    mockGeminiText(
      '[{"title":"Bad","description":"Missing valid choices","choices":[{"text":"A","role":"invalid","feedback":"B"}]}]'
    );

    const scenarios = await geminiClient.generateGameScenarios({ count: 1 });
    expect(scenarios.length).toBe(0);
  });

  it("throws AppError when AI output does not contain JSON", async () => {
    mockGeminiText("this is plain text without json");

    let capturedError: unknown;

    try {
      await geminiClient.generateGameScenarios({ count: 1 });
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(AppError);
    if (capturedError instanceof AppError) {
      expect(capturedError.code).toBe("AI_UNAVAILABLE");
      expect(capturedError.status).toBe(503);
    }
  });
});
