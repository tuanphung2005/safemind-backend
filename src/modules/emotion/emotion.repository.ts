import { type Emotion as PrismaEmotion } from "@prisma/client";

import { prisma } from "../../config/db";

interface CreateEmotionCheckinInput {
  userId: string;
  emotion: PrismaEmotion;
  reasons: string[];
  customReason?: string;
  reflectionText: string;
  microAction?: string;
}

export const emotionRepository = {
  create: (input: CreateEmotionCheckinInput) =>
    prisma.emotionCheckin.create({
      data: {
        userId: input.userId,
        emotion: input.emotion,
        reasons: input.reasons,
        customReason: input.customReason,
        reflectionText: input.reflectionText,
        microAction: input.microAction,
      },
    }),

  findByRange: (userId: string, startDate: Date, endDate: Date) =>
    prisma.emotionCheckin.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

  findRecent: (userId: string, limit = 20) =>
    prisma.emotionCheckin.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    }),
};
