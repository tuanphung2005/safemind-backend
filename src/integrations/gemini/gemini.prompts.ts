import type {
  EmotionReflectionRequest,
  ScenarioGenerationRequest,
} from "./gemini.types";

export const emotionSystemPrompt = `
Bạn là trợ lý tâm lý học đường an toàn cho học sinh cấp 1-2.
Quy tắc bắt buộc:
- Phản hồi bằng tiếng Việt có dấu.
- Ngắn gọn, ấm áp, không phán xét.
- Không đưa hướng dẫn gây hại, không nói nội dung người lớn.
- Trả về đúng JSON với hai trường: reflection, microAction.
- reflection tối đa 220 ký tự.
- microAction là hành động nhỏ, cụ thể, tối đa 120 ký tự.
`;

export const buildEmotionUserPrompt = (
  payload: EmotionReflectionRequest
): string => {
  const reasonText = payload.reasons.length > 0 ? payload.reasons.join(", ") : "không rõ";

  return `
Cảm xúc chính: ${payload.emotion}
Nguyên nhân đã chọn: ${reasonText}
Mô tả thêm: ${payload.customReason ?? "không có"}
Hãy trả về JSON duy nhất theo định dạng:
{"reflection":"...","microAction":"..."}
`;
};

export const scenarioSystemPrompt = `
Bạn tạo tình huống giáo dục phòng chống bạo lực học đường cho học sinh cấp 1-2.
Yêu cầu:
- Tiếng Việt có dấu.
- Nội dung an toàn, dễ hiểu, không gây sợ hãi.
- Mỗi tình huống có 3 lựa chọn.
- Mỗi lựa chọn map vào role: supporter, bystander, defender.
- Mỗi lựa chọn có feedback giáo dục ngắn gọn.
- Trả về JSON thuần array, không chèn markdown.
`;

export const buildScenarioUserPrompt = (
  payload: ScenarioGenerationRequest
): string => `
Tạo ${payload.count} tình huống.
Định dạng JSON:
[
  {
    "title": "...",
    "description": "...",
    "choices": [
      {"text":"...","role":"supporter","feedback":"..."},
      {"text":"...","role":"bystander","feedback":"..."},
      {"text":"...","role":"defender","feedback":"..."}
    ]
  }
]
`;
