import { GameRole as PrismaGameRole } from "@prisma/client";

import { env } from "../../config/env";
import { geminiClient } from "../../integrations/gemini/gemini.client";
import type { ScenarioDraft } from "../../integrations/gemini/gemini.types";
import { AppError } from "../../shared/http/errors";
import { sanitizeText } from "../../shared/safety/content-filter";
import { resolveUserFromDevice } from "../session/session.service";
import { fallbackScenarios } from "./game.fallback";
import { gameRepository } from "./game.repository";
import { prismaToRole, roleToPrisma } from "./game.types";

const shuffle = <T>(items: T[]): T[] => {
  const clone = [...items];

  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }

  return clone;
};

const normalizeKey = (value: string): string => value.trim().toLowerCase();

const toScenarioCreateInput = (scenario: ScenarioDraft, isAiGenerated: boolean) => ({
  title: sanitizeText(scenario.title, 120),
  description: sanitizeText(scenario.description, 260),
  isAiGenerated,
  choices: scenario.choices.slice(0, 3).map((choice) => ({
    text: sanitizeText(choice.text, 140),
    role: roleToPrisma[choice.role],
    feedback: sanitizeText(choice.feedback, 220),
  })),
});

const generateScenariosWithRetry = async (count: number): Promise<ScenarioDraft[]> => {
  if (!geminiClient.isEnabled()) {
    return [];
  }

  const attempts = Math.max(1, env.aiRetries + 1);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const generated = await geminiClient.generateGameScenarios({ count });
      if (generated.length > 0) {
        return generated;
      }
    } catch {
      // Continue to fallback after retries.
    }
  }

  return [];
};

const pickFallbackScenarios = (
  needed: number,
  existingTitleKeys: Set<string>
): ScenarioDraft[] => {
  const candidates = fallbackScenarios.filter(
    (scenario) => !existingTitleKeys.has(normalizeKey(scenario.title))
  );

  if (candidates.length >= needed) {
    return candidates.slice(0, needed);
  }

  const result = [...candidates];
  const short = needed - result.length;

  for (let index = 0; index < short; index += 1) {
    const source = fallbackScenarios[index % fallbackScenarios.length];
    result.push({
      ...source,
      title: `${source.title} (${index + 1})`,
    });
  }

  return result;
};

const ensureScenarioPool = async (requestedLimit: number) => {
  const minimumPool = Math.max(env.scenarioLowWatermark, requestedLimit);
  const existingCount = await gameRepository.countScenarios();

  if (existingCount >= minimumPool) {
    return;
  }

  const missingCount = minimumPool - existingCount;
  const existing = await gameRepository.findScenarioPool(200);
  const existingTitleKeys = new Set(existing.map((scenario) => normalizeKey(scenario.title)));

  const aiGenerated = await generateScenariosWithRetry(missingCount);
  const uniqueAi = aiGenerated.filter(
    (scenario) => !existingTitleKeys.has(normalizeKey(scenario.title))
  );

  for (const scenario of uniqueAi) {
    existingTitleKeys.add(normalizeKey(scenario.title));
  }

  const stillNeeded = Math.max(0, missingCount - uniqueAi.length);
  const fallback = stillNeeded > 0 ? pickFallbackScenarios(stillNeeded, existingTitleKeys) : [];

  const toCreate = [...uniqueAi, ...fallback]
    .map((scenario, index) => {
      const safeScenario = {
        ...scenario,
        title: scenario.title || `Tình huống ${index + 1}`,
        description: scenario.description || "Bạn sẽ làm gì trong tình huống này?",
      };

      return toScenarioCreateInput(safeScenario, index < uniqueAi.length);
    })
    .filter((scenario) => scenario.choices.length === 3);

  if (toCreate.length > 0) {
    await gameRepository.createScenarios(toCreate);
  }
};

const resolveBadgeAward = async (
  userId: string,
  role: PrismaGameRole
): Promise<string | undefined> => {
  if (role !== PrismaGameRole.DEFENDER) {
    return undefined;
  }

  const badges = await gameRepository.findAwardedBadges(userId);
  const hasKindBadge = badges.some((badge) => badge.badgeAwarded === "❤️ Người tử tế");
  const hasProtectorBadge = badges.some((badge) => badge.badgeAwarded === "🛡️ Người bảo vệ");

  if (!hasKindBadge) {
    return "❤️ Người tử tế";
  }

  const defenderCount = await gameRepository.countDefenderResults(userId);
  const projectedCount = defenderCount + 1;

  if (projectedCount >= 3 && !hasProtectorBadge) {
    return "🛡️ Người bảo vệ";
  }

  return undefined;
};

export const gameService = {
  async getScenarios(limit = 5) {
    const safeLimit = Math.min(10, Math.max(1, limit));
    await ensureScenarioPool(safeLimit);

    const pool = await gameRepository.findScenarioPool(Math.max(30, safeLimit * 4));
    const selected = shuffle(pool).slice(0, safeLimit);

    return selected.map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      isAiGenerated: scenario.isAiGenerated,
      choices: scenario.choices.map((choice) => ({
        id: choice.id,
        text: choice.text,
      })),
    }));
  },

  async submitChoice(deviceId: string, scenarioId: string, choiceId: string) {
    const { user, anonymousId } = await resolveUserFromDevice(deviceId);
    const scenario = await gameRepository.findScenarioById(scenarioId);

    if (!scenario) {
      throw new AppError("NOT_FOUND", "Scenario not found", 404);
    }

    const selectedChoice = scenario.choices.find((choice) => choice.id === choiceId);

    if (!selectedChoice) {
      throw new AppError("BAD_REQUEST", "Choice does not belong to scenario", 400);
    }

    const badgeAwarded = await resolveBadgeAward(user.id, selectedChoice.role);

    const result = await gameRepository.createResult({
      userId: user.id,
      scenarioId: scenario.id,
      choiceId: selectedChoice.id,
      role: selectedChoice.role,
      feedback: selectedChoice.feedback,
      badgeAwarded,
    });

    return {
      resultId: result.id,
      anonymousId,
      role: prismaToRole[selectedChoice.role],
      feedback: selectedChoice.feedback,
      badgeAwarded: badgeAwarded ?? null,
      createdAt: result.createdAt.toISOString(),
    };
  },

  async getProfile(deviceId: string) {
    const { user, anonymousId } = await resolveUserFromDevice(deviceId);
    const results = await gameRepository.findResultsByUser(user.id);
    const awardedBadges = await gameRepository.findAwardedBadges(user.id);

    const roleCounts = {
      supporter: 0,
      bystander: 0,
      defender: 0,
    };

    for (const result of results) {
      roleCounts[prismaToRole[result.role]] += 1;
    }

    return {
      anonymousId,
      totalPlayed: results.length,
      roleCounts,
      badges: awardedBadges.map((badge) => ({
        name: badge.badgeAwarded,
        earnedAt: badge.createdAt.toISOString(),
      })),
    };
  },
};
