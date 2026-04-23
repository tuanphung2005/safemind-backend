import { env } from "../../config/env";
import { geminiClient } from "../../integrations/gemini/gemini.client";
import type { EmotionReflectionResult } from "../../integrations/gemini/gemini.types";
import { sanitizeText } from "../../shared/safety/content-filter";
import { hashValue } from "../../shared/utils/hash";
import { resolveUserFromDevice } from "../session/session.service";
import { emotionRepository } from "./emotion.repository";
import {
  emotionToPrisma,
  prismaToEmotion,
  type EmotionCheckinInput,
  type EmotionCheckinResult,
  type EmotionValue,
} from "./emotion.types";

const fallbackContent: Record<
  EmotionValue,
  { reflections: string[]; actions: string[]; jarColor: string }
> = {
  happy: {
    reflections: [
      "Thật tuyệt, bạn đang có một ngày vui. Hãy giữ cảm xúc này bằng cách làm điều tốt nhỏ cho bạn bè.",
      "Cảm xúc vui rất quý. Bạn có thể chia sẻ niềm vui này với người thân để lan tỏa năng lượng tích cực.",
    ],
    actions: [
      "Hãy gửi một lời cảm ơn tới một người đã giúp bạn hôm nay.",
      "Viết 1 điều tuyệt vời nhất của ngày hôm nay.",
    ],
    jarColor: "#FFCA3A",
  },
  sad: {
    reflections: [
      "Buồn là cảm xúc bình thường. Nói ra điều làm bạn buồn là một cách rất can đảm.",
      "Bạn đang rất cố gắng để hiểu cảm xúc của mình. Chia sẻ với người tin cậy sẽ giúp bạn nhẹ hơn.",
    ],
    actions: [
      "Thử viết 3 dòng về điều đang làm bạn buồn.",
      "Thử nói chuyện với một người mà bạn tin tưởng.",
    ],
    jarColor: "#5DA9E9",
  },
  angry: {
    reflections: [
      "Khi tức giận, có thể dừng lại một chút để lựa chọn cách phản ứng an toàn hơn.",
      "Bạn đã làm rất tốt khi không giữ trong lòng. Hiểu cảm xúc tức giận là bước đầu để giảm căng thẳng.",
    ],
    actions: [
      "Hít vào thật sâu 5 lần rồi uống một ngụm nước.",
      "Rời khỏi tình huống trong 1 phút trước khi nói tiếp.",
    ],
    jarColor: "#FF595E",
  },
  anxious: {
    reflections: [
      "Lo lắng có thể đến bất ngờ. Bạn có thể bắt đầu bằng một việc nhỏ để lấy lại sự bình tĩnh.",
      "Bạn không cô đơn với sự lo lắng. Từng bước nhỏ sẽ giúp bạn cảm thấy dễ chịu hơn.",
    ],
    actions: [
      "Nhìn quanh và gọi tên 5 đồ vật bạn đang thấy.",
      "Nghe âm thanh thư giãn trong 2 phút.",
    ],
    jarColor: "#8AC926",
  },
  neutral: {
    reflections: [
      "Cảm xúc bình thường là một trạng thái tốt để quan sát bản thân.",
      "Bạn đang giữ nhịp ổn định. Thử ghi lại một điều bạn muốn cải thiện nhẹ trong ngày mai.",
    ],
    actions: [
      "Thử vận động nhẹ 1 phút để nạp năng lượng.",
      "Viết một mục tiêu nhỏ cho ngày tiếp theo.",
    ],
    jarColor: "#ADB5BD",
  },
};

const pickBySeed = (items: string[], seed: string): string => {
  if (items.length === 0) {
    return "";
  }

  const seedHex = hashValue(seed).slice(0, 8);
  const seedNumber = Number.parseInt(seedHex, 16);
  const index = seedNumber % items.length;

  return items[index];
};

const buildRuleBasedReflection = (
  input: EmotionCheckinInput
): EmotionReflectionResult => {
  const fallback = fallbackContent[input.emotion];
  const reasonSeed = `${input.emotion}-${input.reasons.join("|")}-${input.customReason ?? ""}`;

  return {
    reflection: pickBySeed(fallback.reflections, reasonSeed),
    microAction: pickBySeed(fallback.actions, `${reasonSeed}-action`),
  };
};

const toSafeReasons = (reasons: string[]): string[] =>
  reasons
    .map((reason) => sanitizeText(reason, 80))
    .filter((reason) => reason.length > 0)
    .slice(0, 5);

const requestAiReflection = async (
  input: EmotionCheckinInput
): Promise<EmotionReflectionResult> => {
  const attempts = Math.max(1, env.aiRetries + 1);
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await geminiClient.generateEmotionReflection({
        emotion: input.emotion,
        reasons: input.reasons,
        customReason: input.customReason,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const getWeekRange = (weekOffset: number): { startDate: Date; endDate: Date } => {
  const now = new Date();
  const date = new Date(now);
  date.setDate(now.getDate() - weekOffset * 7);

  const day = date.getDay();
  const diffToMonday = (day + 6) % 7;

  const startDate = new Date(date);
  startDate.setDate(date.getDate() - diffToMonday);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 7);

  return { startDate, endDate };
};

const dayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const buildInsight = (counts: Record<EmotionValue, number>): string => {
  const negative = counts.sad + counts.angry + counts.anxious;

  if (negative >= 4) {
    return "Tuần này cảm xúc tiêu cực xuất hiện nhiều. Bạn có thể thử chơi tình huống để luyện cách ứng phó.";
  }

  if (counts.happy > 0 && counts.happy >= negative) {
    return "Bạn đang có nhiều khoảnh khắc tích cực trong tuần này. Hãy giữ nhịp này nhé.";
  }

  return "Bạn đang theo dõi cảm xúc rất tốt. Mỗi ngày một chút sẽ giúp bạn hiểu mình hơn.";
};

export const emotionService = {
  async createCheckin(input: EmotionCheckinInput): Promise<EmotionCheckinResult> {
    const reasons = toSafeReasons(input.reasons ?? []);
    const customReason = input.customReason
      ? sanitizeText(input.customReason, 300)
      : undefined;

    const normalizedInput: EmotionCheckinInput = {
      ...input,
      reasons,
      customReason,
    };

    const { user, anonymousId } = await resolveUserFromDevice(input.deviceId);

    let reflection = buildRuleBasedReflection(normalizedInput);
    let fallbackUsed = true;

    if (geminiClient.isEnabled()) {
      try {
        reflection = await requestAiReflection(normalizedInput);
        fallbackUsed = false;
      } catch {
        fallbackUsed = true;
      }
    }

    const created = await emotionRepository.create({
      userId: user.id,
      emotion: emotionToPrisma[normalizedInput.emotion],
      reasons: normalizedInput.reasons,
      customReason: normalizedInput.customReason,
      reflectionText: reflection.reflection,
      microAction: reflection.microAction,
    });

    return {
      checkinId: created.id,
      anonymousId,
      reflection: reflection.reflection,
      microAction: reflection.microAction,
      fallbackUsed,
      createdAt: created.createdAt.toISOString(),
    };
  },

  async getWeeklyStats(deviceId: string, weekOffset = 0) {
    const { user } = await resolveUserFromDevice(deviceId);
    const { startDate, endDate } = getWeekRange(weekOffset);

    const entries = await emotionRepository.findByRange(user.id, startDate, endDate);

    const counts: Record<EmotionValue, number> = {
      happy: 0,
      sad: 0,
      angry: 0,
      anxious: 0,
      neutral: 0,
    };

    const dailyBuckets = dayLabels.map((label) => ({
      day: label,
      total: 0,
      topEmotion: "neutral" as EmotionValue,
    }));

    for (const entry of entries) {
      const emotion = prismaToEmotion[entry.emotion];
      counts[emotion] += 1;

      const day = entry.createdAt.getDay();
      dailyBuckets[day].total += 1;
    }

    const dominantEmotion = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "neutral") as EmotionValue;

    const jarColor = fallbackContent[dominantEmotion].jarColor;
    const totalEntries = entries.length;
    const jarFillPercent = Math.min(100, totalEntries * 12);

    return {
      weekOffset,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      counts,
      dominantEmotion,
      jar: {
        color: jarColor,
        fillPercent: jarFillPercent,
      },
      insight: buildInsight(counts),
      dailyBuckets,
    };
  },

  async getHistory(deviceId: string, limit = 20) {
    const { user } = await resolveUserFromDevice(deviceId);
    const entries = await emotionRepository.findRecent(user.id, limit);

    return entries.map((entry) => ({
      id: entry.id,
      emotion: prismaToEmotion[entry.emotion],
      reasons: entry.reasons,
      customReason: entry.customReason,
      reflection: entry.reflectionText,
      microAction: entry.microAction,
      createdAt: entry.createdAt.toISOString(),
    }));
  },
};
