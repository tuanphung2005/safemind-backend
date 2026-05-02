import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  setDefaultTimeout,
} from "bun:test";

setDefaultTimeout(30_000);

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const suite = hasDatabaseUrl ? describe : describe.skip;

suite("SafeMind prompt requirements", () => {
  let app: { handle: (request: Request) => Promise<Response> };

  interface ApiResult {
    status: number;
    body: any;
    raw: string;
    isJson: boolean;
  }

  const uniqueDeviceId = (prefix: string): string =>
    `${prefix}-${Date.now()}-${crypto.randomUUID()}`;

  const requestJson = async (
    path: string,
    init?: RequestInit
  ): Promise<ApiResult> => {
    const response = await app.handle(new Request(`http://localhost${path}`, init));
    const raw = await response.text();

    try {
      const body = raw.length > 0 ? JSON.parse(raw) : null;

      return {
        status: response.status,
        body,
        raw,
        isJson: true,
      };
    } catch {
      return {
        status: response.status,
        body: null,
        raw,
        isJson: false,
      };
    }
  };

  beforeAll(async () => {
    // Keep tests deterministic and avoid external AI calls.
    process.env.GEMINI_API_KEY = "";
    process.env.AI_RETRIES = "0";
    process.env.SCENARIO_LOW_WATERMARK = "1";

    const appModule = await import("../src/app");
    app = appModule.createApp();
  });

  afterAll(async () => {
    const dbModule = await import("../src/config/db");
    await dbModule.prisma.$disconnect();
  });

  it("supports Emotion Journal check-in and weekly analytics", async () => {
    const deviceId = uniqueDeviceId("emotion");

    const session = await requestJson("/api/v1/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });

    expect(session.status).toBe(200);
    expect(session.body.success).toBe(true);
    expect(session.body.data.anonymousId.startsWith("anon_")).toBe(true);

    const checkin = await requestJson("/api/v1/emotions/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        emotion: "angry",
        reasons: ["bị bạn trêu chọc"],
        customReason: "Mình thấy rất bực khi bị trêu trước lớp",
      }),
    });

    expect(checkin.status).toBe(200);
    expect(checkin.body.success).toBe(true);
    expect(typeof checkin.body.data.reflection).toBe("string");
    expect(checkin.body.data.reflection.length).toBeGreaterThan(0);
    expect(typeof checkin.body.data.microAction).toBe("string");
    expect(checkin.body.data.microAction.length).toBeGreaterThan(0);
    expect(checkin.body.data.safetySignal.hasDangerSignal).toBe(false);
    expect(checkin.body.data.safetySignal.suggestedAction).toBe("none");

    const weekly = await requestJson(
      `/api/v1/emotions/weekly-stats?deviceId=${encodeURIComponent(deviceId)}&weekOffset=0`
    );

    expect(weekly.status).toBe(200);
    expect(weekly.body.success).toBe(true);
    expect(weekly.body.data.counts.angry).toBeGreaterThanOrEqual(1);
    expect(weekly.body.data.jar.fillPercent).toBeGreaterThan(0);
    expect(typeof weekly.body.data.insight).toBe("string");
    expect(Array.isArray(weekly.body.data.dailyBuckets)).toBe(true);
    expect(weekly.body.data.dailyBuckets.length).toBe(7);
    expect(typeof weekly.body.data.dailyBuckets[0].topEmotion).toBe("string");
  });

  it("exposes root and health endpoints", async () => {
    const root = await requestJson("/");
    expect(root.status).toBe(200);
    expect(root.body.success).toBe(true);
    expect(root.body.data.service).toBe("safemind-backend");

    const health = await requestJson("/api/v1/health");
    expect(health.status).toBe(200);
    expect(health.body.success).toBe(true);
    expect(health.body.data.status).toBe("ok");
    expect(typeof health.body.data.timestamp).toBe("string");
  });

  it("returns validation envelope when request body is invalid", async () => {
    const invalid = await requestJson("/api/v1/emotions/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: "abc",
        emotion: "angry",
      }),
    });

    expect([400, 422]).toContain(invalid.status);
    if (invalid.isJson) {
      if (invalid.body && typeof invalid.body.success === "boolean") {
        expect(invalid.body.success).toBe(false);
        expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
      } else {
        expect(invalid.body.type).toBe("validation");
        expect(typeof invalid.body.message).toBe("string");
      }
    } else {
      expect(invalid.raw.length).toBeGreaterThan(0);
    }
  });

  it("supports SOS classification with level 1 and level 3 escalation hints", async () => {
    const deviceId = uniqueDeviceId("sos");

    const level1 = await requestJson("/api/v1/sos/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        situation: "Bạn cùng lớp trêu mình trong giờ ra chơi",
      }),
    });

    expect(level1.status).toBe(200);
    expect(level1.body.success).toBe(true);
    expect(level1.body.data.level).toBe("level1");
    expect(level1.body.data.showHotline).toBe(false);

    const level3 = await requestJson("/api/v1/sos/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        situation: "Có bạn đe dọa đánh mình và cầm dao",
      }),
    });

    expect(level3.status).toBe(200);
    expect(level3.body.success).toBe(true);
    expect(level3.body.data.level).toBe("level3");
    expect(level3.body.data.showHotline).toBe(true);
    expect(level3.body.data.hotline).toBe("111");

    const byId = await requestJson(
      `/api/v1/sos/report/${level3.body.data.id}?deviceId=${encodeURIComponent(deviceId)}`
    );

    expect(byId.status).toBe(200);
    expect(byId.body.success).toBe(true);
    expect(byId.body.data.level).toBe("level3");
  });

  it("classifies accented Vietnamese SOS descriptions correctly", async () => {
    const deviceId = uniqueDeviceId("sos-accent");

    const level2 = await requestJson("/api/v1/sos/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        situation: "Các bạn nói xấu và cô lập mình trên nhóm lớp",
      }),
    });

    expect(level2.status).toBe(200);
    expect(level2.body.success).toBe(true);
    expect(level2.body.data.level).toBe("level2");
    expect(level2.body.data.showHotline).toBe(false);

    const level3 = await requestJson("/api/v1/sos/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        situation: "Có bạn đe dọa sẽ đánh mình và còn cầm dao",
      }),
    });

    expect(level3.status).toBe(200);
    expect(level3.body.success).toBe(true);
    expect(level3.body.data.level).toBe("level3");
    expect(level3.body.data.showHotline).toBe(true);
  });

  it("protects SOS report access by anonymous identity", async () => {
    const ownerDeviceId = uniqueDeviceId("sos-owner");
    const outsiderDeviceId = uniqueDeviceId("sos-outsider");

    const created = await requestJson("/api/v1/sos/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: ownerDeviceId,
        situation: "Có bạn nói xấu mình liên tục",
      }),
    });

    expect(created.status).toBe(200);
    expect(created.body.success).toBe(true);

    const denied = await requestJson(
      `/api/v1/sos/report/${created.body.data.id}?deviceId=${encodeURIComponent(outsiderDeviceId)}`
    );

    expect([400, 404]).toContain(denied.status);
    if (denied.isJson) {
      expect(denied.body.success).toBe(false);
      expect(["NOT_FOUND", "BAD_REQUEST", "VALIDATION_ERROR"]).toContain(
        denied.body.error.code
      );
    } else {
      expect(denied.raw.length).toBeGreaterThan(0);
    }
  });

  it("supports Role Awareness Game scenario and role feedback", async () => {
    const deviceId = uniqueDeviceId("game");

    const scenarios = await requestJson("/api/v1/game/scenarios?limit=1");

    expect(scenarios.status).toBe(200);
    expect(scenarios.body.success).toBe(true);
    expect(Array.isArray(scenarios.body.data.scenarios)).toBe(true);
    expect(scenarios.body.data.scenarios.length).toBeGreaterThan(0);

    const scenario = scenarios.body.data.scenarios[0];
    expect(Array.isArray(scenario.choices)).toBe(true);
    expect(scenario.choices.length).toBe(3);

    const submit = await requestJson(
      `/api/v1/game/scenario/${scenario.id}/submit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          choiceId: scenario.choices[0].id,
        }),
      }
    );

    expect(submit.status).toBe(200);
    expect(submit.body.success).toBe(true);
    expect(["supporter", "bystander", "defender"]).toContain(submit.body.data.role);
    expect(typeof submit.body.data.feedback).toBe("string");
    expect(submit.body.data.feedback.length).toBeGreaterThan(0);
  });

  it("rejects game submission when choice does not belong to scenario", async () => {
    const deviceId = uniqueDeviceId("game-invalid-choice");
    const scenarios = await requestJson("/api/v1/game/scenarios?limit=1");
    const scenario = scenarios.body.data.scenarios[0];

    const invalidSubmit = await requestJson(
      `/api/v1/game/scenario/${scenario.id}/submit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          choiceId: crypto.randomUUID(),
        }),
      }
    );

    expect([400, 404]).toContain(invalidSubmit.status);
    if (invalidSubmit.isJson) {
      expect(invalidSubmit.body.success).toBe(false);
      expect(["BAD_REQUEST", "NOT_FOUND", "VALIDATION_ERROR"]).toContain(
        invalidSubmit.body.error.code
      );
    } else {
      expect(invalidSubmit.raw.length).toBeGreaterThan(0);
    }
  });

  it("supports cross-feature orchestration recommendation", async () => {
    const deviceId = uniqueDeviceId("orchestration");

    const negativeEmotions = ["sad", "angry", "anxious", "sad"];

    for (const emotion of negativeEmotions) {
      const response = await requestJson("/api/v1/emotions/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          emotion,
          reasons: ["áp lực học tập"],
        }),
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    }

    const recommendation = await requestJson(
      `/api/v1/user/recommendations?deviceId=${encodeURIComponent(deviceId)}`
    );

    expect(recommendation.status).toBe(200);
    expect(recommendation.body.success).toBe(true);
    expect(recommendation.body.data.nextRecommendation).toBe("play_game");
    expect(recommendation.body.data.priority).toBe(1);
  });

  it("prioritizes SOS recommendation when level3 signal exists", async () => {
    const deviceId = uniqueDeviceId("orchestration-level3");

    const sos = await requestJson("/api/v1/sos/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        situation: "Bạn đó đe dọa đánh mình và cầm dao",
      }),
    });

    expect(sos.status).toBe(200);
    expect(sos.body.success).toBe(true);
    expect(sos.body.data.level).toBe("level3");

    const recommendation = await requestJson(
      `/api/v1/user/recommendations?deviceId=${encodeURIComponent(deviceId)}`
    );

    expect(recommendation.status).toBe(200);
    expect(recommendation.body.success).toBe(true);
    expect(recommendation.body.data.nextRecommendation).toBe("sos_check");
    expect(recommendation.body.data.priority).toBe(1);
  });

  it("escalates to SOS recommendation when negative journal entries contain danger signals", async () => {
    const deviceId = uniqueDeviceId("orchestration-emotion-danger");

    for (const customReason of [
      "Mình sợ vì có bạn đe dọa đánh mình sau giờ học",
      "Hôm nay mình lo vì bạn đó vẫn dọa đánh và ép mình đi theo",
    ]) {
      const checkin = await requestJson("/api/v1/emotions/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          emotion: "anxious",
          reasons: ["mâu thuẫn với bạn"],
          customReason,
        }),
      });

      expect(checkin.status).toBe(200);
      expect(checkin.body.success).toBe(true);
      expect(checkin.body.data.safetySignal.hasDangerSignal).toBe(true);
      expect(checkin.body.data.safetySignal.suggestedAction).toBe("open_sos");
    }

    const recommendation = await requestJson(
      `/api/v1/user/recommendations?deviceId=${encodeURIComponent(deviceId)}`
    );

    expect(recommendation.status).toBe(200);
    expect(recommendation.body.success).toBe(true);
    expect(recommendation.body.data.nextRecommendation).toBe("sos_check");
    expect(recommendation.body.data.priority).toBe(1);
    expect(recommendation.body.data.signals.hasEmotionDangerSignal).toBe(true);
    expect(recommendation.body.data.signals.emotionDangerKeywords.length).toBeGreaterThan(0);
  });

  it("returns emotion history list for a device", async () => {
    const deviceId = uniqueDeviceId("emotion-history");

    await requestJson("/api/v1/emotions/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        emotion: "sad",
        reasons: ["áp lực học tập"],
      }),
    });

    await requestJson("/api/v1/emotions/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        emotion: "anxious",
        reasons: ["lo bài kiểm tra"],
      }),
    });

    const history = await requestJson(
      `/api/v1/emotions/history?deviceId=${encodeURIComponent(deviceId)}&limit=10`
    );

    expect(history.status).toBe(200);
    expect(history.body.success).toBe(true);
    expect(Array.isArray(history.body.data.entries)).toBe(true);
    expect(history.body.data.entries.length).toBeGreaterThanOrEqual(2);
    expect(typeof history.body.data.entries[0].createdAt).toBe("string");
  });

  it("uses AI response format contract when AI path is enabled", async () => {
    const deviceId = uniqueDeviceId("emotion-ai-format");
    const geminiModule = await import("../src/integrations/gemini/gemini.client");
    const geminiClient = geminiModule.geminiClient as any;

    const originalIsEnabled = geminiClient.isEnabled;
    const originalGenerate = geminiClient.generateEmotionReflection;

    geminiClient.isEnabled = () => true;
    geminiClient.generateEmotionReflection = async () => ({
      reflection: "Mình hiểu bạn đang khó chịu. Bạn đã rất dũng cảm khi chia sẻ.",
      microAction: "Hãy hít sâu 5 lần và uống một ngụm nước.",
    });

    try {
      const checkin = await requestJson("/api/v1/emotions/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          emotion: "angry",
          reasons: ["bị bạn trêu"],
        }),
      });

      expect(checkin.status).toBe(200);
      expect(checkin.body.success).toBe(true);
      expect(checkin.body.data.fallbackUsed).toBe(false);
      expect(typeof checkin.body.data.reflection).toBe("string");
      expect(typeof checkin.body.data.microAction).toBe("string");
      expect(checkin.body.data.reflection.length).toBeGreaterThan(0);
      expect(checkin.body.data.microAction.length).toBeGreaterThan(0);
      expect(checkin.body.data.safetySignal.hasDangerSignal).toBe(false);
    } finally {
      geminiClient.isEnabled = originalIsEnabled;
      geminiClient.generateEmotionReflection = originalGenerate;
    }
  });

  it("returns JSON envelope for missing route", async () => {
    const missing = await requestJson("/api/v1/does-not-exist");

    expect(missing.status).toBe(404);
    expect(missing.isJson).toBe(true);
    expect(missing.body.success).toBe(false);
    expect(missing.body.error.code).toBe("NOT_FOUND");
  });
});
