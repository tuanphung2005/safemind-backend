import { env } from "../../config/env";
import { geminiClient } from "../../integrations/gemini/gemini.client";
import type { EmotionReflectionResult } from "../../integrations/gemini/gemini.types";
import {
  extractDangerKeywords,
  normalizeVietnameseText,
  sanitizeText,
} from "../../shared/safety/content-filter";
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

type ReasonCategory =
  | "peer_conflict"
  | "school_pressure"
  | "adult_feedback"
  | "isolation"
  | "safety_risk"
  | "general";

const reasonCategoryActions: Record<Exclude<ReasonCategory, "general">, string> = {
  peer_conflict:
    "Nếu an toàn, hãy nói ngắn gọn: mình không thích điều đó, rồi rời khỏi nhóm một lúc.",
  school_pressure:
    "Chọn một việc học nhỏ nhất để làm trong 10 phút, sau đó nghỉ ngắn.",
  adult_feedback:
    "Khi bình tĩnh hơn, hãy nói với người lớn: con muốn hiểu mình cần sửa điều gì.",
  isolation:
    "Thử bắt chuyện với một bạn bạn tin, hoặc nhờ giáo viên xếp nhóm hỗ trợ.",
  safety_risk:
    "Nếu đang nguy hiểm, hãy rời khỏi nơi đó và tìm người lớn đáng tin cậy hoặc gọi 111.",
};

const classifyReasonCategory = (input: EmotionCheckinInput): ReasonCategory => {
  const reasonText = normalizeVietnameseText(
    [...input.reasons, input.customReason ?? ""].join(" ")
  );

  if (extractDangerKeywords(reasonText).length > 0) {
    return "safety_risk";
  }

  if (
    ["trieu choc", "treu choc", "mau thuan", "cai nhau", "ban be"].some((keyword) =>
      reasonText.includes(keyword)
    )
  ) {
    return "peer_conflict";
  }

  if (
    ["diem kem", "ap luc hoc", "bai kiem tra", "kiem tra", "bai tap"].some(
      (keyword) => reasonText.includes(keyword)
    )
  ) {
    return "school_pressure";
  }

  if (
    ["co la", "thay la", "me la", "bo la", "phu huynh la", "bi phe binh"].some(
      (keyword) => reasonText.includes(keyword)
    )
  ) {
    return "adult_feedback";
  }

  if (
    ["khong ai choi", "co lap", "bo roi", "mot minh", "khong co ban"].some(
      (keyword) => reasonText.includes(keyword)
    )
  ) {
    return "isolation";
  }

  return "general";
};

const buildRuleBasedReflection = (
  input: EmotionCheckinInput
): EmotionReflectionResult => {
  const fallback = fallbackContent[input.emotion];
  const reasonSeed = `${input.emotion}-${input.reasons.join("|")}-${input.customReason ?? ""}`;
  const reasonCategory = classifyReasonCategory(input);

  return {
    reflection: pickBySeed(fallback.reflections, reasonSeed),
    microAction:
      reasonCategory === "general"
        ? pickBySeed(fallback.actions, `${reasonSeed}-action`)
        : reasonCategoryActions[reasonCategory],
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

const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const getWeekdayIndex = (date: Date): number => (date.getDay() + 6) % 7;

const emotionLabels: Record<EmotionValue, string> = {
  happy: "vui",
  sad: "buồn",
  angry: "tức giận",
  anxious: "lo lắng",
  neutral: "bình thường",
};

const buildInsight = (
  counts: Record<EmotionValue, number>,
  dailyBuckets?: Array<{ day: string; total: number; topEmotion: EmotionValue }>
): string => {
  const negative = counts.sad + counts.angry + counts.anxious;

  if (negative >= 4) {
    const negativeDays =
      dailyBuckets
        ?.filter(
          (bucket) =>
            bucket.total > 0 &&
            (bucket.topEmotion === "sad" ||
              bucket.topEmotion === "angry" ||
              bucket.topEmotion === "anxious")
        )
        .map((bucket) => bucket.day)
        .slice(0, 3) ?? [];

    if (negativeDays.length > 0) {
      return `Tuần này cảm xúc tiêu cực xuất hiện nhiều vào ${negativeDays.join(", ")}. Bạn có thể thử chơi tình huống để luyện cách ứng phó.`;
    }

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

    const matchedDangerKeywords = Array.from(
      new Set(extractDangerKeywords([...reasons, customReason ?? ""].join(" ")))
    );
    const hasDangerSignal = matchedDangerKeywords.length > 0;
    const { user, anonymousId } = await resolveUserFromDevice(input.deviceId);

    let reflection = buildRuleBasedReflection(normalizedInput);
    let fallbackUsed = true;

    if (geminiClient.isEnabled() && !hasDangerSignal) {
      try {
        reflection = await requestAiReflection(normalizedInput);
        fallbackUsed = false;
      } catch {
        fallbackUsed = true;
      }
    }

    if (hasDangerSignal) {
      reflection = {
        reflection:
          "Điều bạn kể có dấu hiệu không an toàn. Bạn không cần tự xử lý một mình.",
        microAction:
          "Hãy rời khỏi nơi nguy hiểm, tìm người lớn đáng tin cậy hoặc gọi 111 nếu cần.",
      };
      fallbackUsed = true;
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
      safetySignal: {
        hasDangerSignal,
        matchedKeywords: matchedDangerKeywords,
        suggestedAction: hasDangerSignal ? "open_sos" : "none",
      },
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

    const dailyCounts = dayLabels.map((label) => ({
      day: label,
      counts: {
        happy: 0,
        sad: 0,
        angry: 0,
        anxious: 0,
        neutral: 0,
      } satisfies Record<EmotionValue, number>,
    }));

    for (const entry of entries) {
      const emotion = prismaToEmotion[entry.emotion];
      counts[emotion] += 1;

      const day = getWeekdayIndex(entry.createdAt);
      dailyCounts[day].counts[emotion] += 1;
    }

    const dailyBuckets = dailyCounts.map((bucket) => {
      const sortedCounts = Object.entries(bucket.counts).sort((a, b) => b[1] - a[1]);
      const topEmotion = (sortedCounts[0]?.[0] ?? "neutral") as EmotionValue;
      const total = Object.values(bucket.counts).reduce((sum, count) => sum + count, 0);

      return {
        day: bucket.day,
        total,
        topEmotion,
        topEmotionLabel: emotionLabels[topEmotion],
        counts: bucket.counts,
      };
    });

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
      insight: buildInsight(counts, dailyBuckets),
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
