import { type SosLevel as PrismaSosLevel } from "@prisma/client";

import { prisma } from "../../config/db";

interface CreateSosReportInput {
  userId: string;
  situation: string;
  level: PrismaSosLevel;
  matchedKeywords: string[];
  guidance: string;
  showHotline: boolean;
}

export const sosRepository = {
  create: (input: CreateSosReportInput) =>
    prisma.sosReport.create({
      data: {
        userId: input.userId,
        situation: input.situation,
        level: input.level,
        matchedKeywords: input.matchedKeywords,
        guidance: input.guidance,
        showHotline: input.showHotline,
      },
    }),

  findById: (id: string) =>
    prisma.sosReport.findUnique({
      where: {
        id,
      },
    }),

  findRecentByUser: (userId: string, days = 14) => {
    const from = new Date();
    from.setDate(from.getDate() - days);

    return prisma.sosReport.findMany({
      where: {
        userId,
        createdAt: {
          gte: from,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },
};
