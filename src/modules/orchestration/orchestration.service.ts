import {
  Emotion as PrismaEmotion,
  RecommendationType as PrismaRecommendationType,
  SosLevel as PrismaSosLevel,
} from "@prisma/client";

import { prisma } from "../../config/db";
import { resolveUserFromDevice } from "../session/session.service";

type RecommendationValue = "play_game" | "sos_check" | "micro_action" | "none";

const recommendationToPrisma: Record<RecommendationValue, PrismaRecommendationType> = {
  play_game: PrismaRecommendationType.PLAY_GAME,
  sos_check: PrismaRecommendationType.SOS_CHECK,
  micro_action: PrismaRecommendationType.MICRO_ACTION,
  none: PrismaRecommendationType.NONE,
};

const getLastDays = (days: number): Date => {
  const from = new Date();
  from.setDate(from.getDate() - days);
  return from;
};

export const orchestrationService = {
  async getRecommendation(deviceId: string) {
    const { user, anonymousId } = await resolveUserFromDevice(deviceId);

    const sinceSevenDays = getLastDays(7);
    const sinceFourteenDays = getLastDays(14);

    const [emotions, sosReports, latestGame] = await Promise.all([
      prisma.emotionCheckin.findMany({
        where: {
          userId: user.id,
          createdAt: {
            gte: sinceSevenDays,
          },
        },
      }),
      prisma.sosReport.findMany({
        where: {
          userId: user.id,
          createdAt: {
            gte: sinceFourteenDays,
          },
        },
      }),
      prisma.gameResult.findFirst({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const negativeCount = emotions.filter(
      (entry) =>
        entry.emotion === PrismaEmotion.SAD ||
        entry.emotion === PrismaEmotion.ANGRY ||
        entry.emotion === PrismaEmotion.ANXIOUS
    ).length;

    const hasLevel3 = sosReports.some((report) => report.level === PrismaSosLevel.LEVEL3);
    const daysSinceLastGame = latestGame
      ? Math.floor((Date.now() - latestGame.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    let nextRecommendation: RecommendationValue = "none";
    let reason = "Bạn đang giữ nhịp ổn định. Hãy tiếp tục check-in mỗi ngày.";
    let priority = 3;

    if (hasLevel3) {
      nextRecommendation = "sos_check";
      reason = "Hệ thống nhận thấy dấu hiệu nguy cơ cao. Hãy ưu tiên tìm người lớn đáng tin cậy và dùng SOS khi cần.";
      priority = 1;
    } else if (negativeCount >= 4) {
      nextRecommendation = "play_game";
      reason = "Cảm xúc tiêu cực lặp lại nhiều trong 7 ngày. Thử chơi tình huống để luyện phản ứng an toàn.";
      priority = 1;
    } else if (negativeCount >= 2 || daysSinceLastGame > 14) {
      nextRecommendation = "micro_action";
      reason = "Bạn có thể thử một micro-action nhỏ để cân bằng cảm xúc ngày hôm nay.";
      priority = 2;
    }

    await prisma.recommendationEvent.create({
      data: {
        userId: user.id,
        type: recommendationToPrisma[nextRecommendation],
        reason,
        priority,
      },
    });

    return {
      anonymousId,
      nextRecommendation,
      reason,
      priority,
      signals: {
        negativeCount7d: negativeCount,
        hasLevel3Signal: hasLevel3,
        daysSinceLastGame,
      },
    };
  },
};
