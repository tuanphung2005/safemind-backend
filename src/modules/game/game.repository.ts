import { type GameRole as PrismaGameRole } from "@prisma/client";

import { prisma } from "../../config/db";

interface ScenarioCreateInput {
  title: string;
  description: string;
  isAiGenerated: boolean;
  choices: Array<{
    text: string;
    role: PrismaGameRole;
    feedback: string;
  }>;
}

interface CreateResultInput {
  userId: string;
  scenarioId: string;
  choiceId: string;
  role: PrismaGameRole;
  feedback: string;
  badgeAwarded?: string;
}

export const gameRepository = {
  countScenarios: () => prisma.gameScenario.count(),

  findScenarioPool: (take = 40) =>
    prisma.gameScenario.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take,
      include: {
        choices: true,
      },
    }),

  findScenarioById: (id: string) =>
    prisma.gameScenario.findUnique({
      where: { id },
      include: {
        choices: true,
      },
    }),

  createScenarios: async (inputs: ScenarioCreateInput[]) => {
    if (inputs.length === 0) {
      return [];
    }

    return prisma.$transaction(
      inputs.map((scenario) =>
        prisma.gameScenario.create({
          data: {
            title: scenario.title,
            description: scenario.description,
            isAiGenerated: scenario.isAiGenerated,
            choices: {
              create: scenario.choices,
            },
          },
          include: {
            choices: true,
          },
        })
      )
    );
  },

  createResult: (input: CreateResultInput) =>
    prisma.gameResult.create({
      data: {
        userId: input.userId,
        scenarioId: input.scenarioId,
        choiceId: input.choiceId,
        role: input.role,
        feedback: input.feedback,
        badgeAwarded: input.badgeAwarded,
      },
    }),

  countDefenderResults: (userId: string) =>
    prisma.gameResult.count({
      where: {
        userId,
        role: "DEFENDER",
      },
    }),

  findAwardedBadges: (userId: string) =>
    prisma.gameResult.findMany({
      where: {
        userId,
        badgeAwarded: {
          not: null,
        },
      },
      select: {
        badgeAwarded: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),

  findResultsByUser: (userId: string) =>
    prisma.gameResult.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    }),
};
