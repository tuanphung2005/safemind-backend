import { AppError } from "../../shared/http/errors";
import {
  extractDangerKeywords,
  sanitizeText,
} from "../../shared/safety/content-filter";
import { resolveUserFromDevice } from "../session/session.service";
import { sosRepository } from "./sos.repository";
import { prismaToSos, sosToPrisma, type SosLevelValue } from "./sos.types";

const level3Keywords = [
  "danh",
  "hanh hung",
  "de doa",
  "dao",
  "sung",
  "tu sat",
  "giet",
  "bat coc",
  "ep buoc",
];

const level2Keywords = [
  "co lap",
  "noi xau",
  "bo roi",
  "trom do",
  "deu ca",
  "truy tim",
  "bat nat",
  "lang ma",
];

const classifySos = (
  situation: string
): {
  level: SosLevelValue;
  guidance: string;
  matchedKeywords: string[];
  showHotline: boolean;
} => {
  const normalized = situation.toLowerCase();
  const danger = new Set<string>(extractDangerKeywords(normalized));

  for (const keyword of level3Keywords) {
    if (normalized.includes(keyword)) {
      danger.add(keyword);
    }
  }

  if (danger.size > 0) {
    return {
      level: "level3",
      guidance:
        "Tình huống này có dấu hiệu nguy hiểm. Hãy rời khỏi nơi đó, tìm người lớn đáng tin cậy và gọi 111 nếu cần.",
      matchedKeywords: Array.from(danger),
      showHotline: true,
    };
  }

  const medium = level2Keywords.filter((keyword) => normalized.includes(keyword));

  if (medium.length > 0) {
    return {
      level: "level2",
      guidance:
        "Bạn nên nói với giáo viên hoặc phụ huynh đáng tin cậy để được hỗ trợ sớm.",
      matchedKeywords: medium,
      showHotline: false,
    };
  }

  return {
    level: "level1",
    guidance:
      "Bạn có thể nói rõ giới hạn của mình, rời khỏi tình huống và tìm bạn bè tốt bụng để đồng hành.",
    matchedKeywords: [],
    showHotline: false,
  };
};

export const sosService = {
  async createReport(deviceId: string, situation: string) {
    const safeSituation = sanitizeText(situation, 1500);
    const { user, anonymousId } = await resolveUserFromDevice(deviceId);

    const result = classifySos(safeSituation);

    const report = await sosRepository.create({
      userId: user.id,
      situation: safeSituation,
      level: sosToPrisma[result.level],
      matchedKeywords: result.matchedKeywords,
      guidance: result.guidance,
      showHotline: result.showHotline,
    });

    return {
      id: report.id,
      anonymousId,
      level: result.level,
      guidance: result.guidance,
      showHotline: result.showHotline,
      hotline: result.showHotline ? "111" : null,
      matchedKeywords: result.matchedKeywords,
      createdAt: report.createdAt.toISOString(),
    };
  },

  async getReportById(deviceId: string, reportId: string) {
    const { user } = await resolveUserFromDevice(deviceId);
    const report = await sosRepository.findById(reportId);

    if (!report || report.userId !== user.id) {
      throw new AppError("NOT_FOUND", "SOS report not found", 404);
    }

    return {
      id: report.id,
      level: prismaToSos[report.level],
      situation: report.situation,
      matchedKeywords: report.matchedKeywords,
      guidance: report.guidance,
      showHotline: report.showHotline,
      hotline: report.showHotline ? "111" : null,
      createdAt: report.createdAt.toISOString(),
    };
  },
};
