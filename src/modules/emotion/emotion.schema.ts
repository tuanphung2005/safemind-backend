import { t } from "elysia";

export const emotionCheckinBody = t.Object({
  deviceId: t.String({ minLength: 6, maxLength: 128 }),
  emotion: t.Union([
    t.Literal("happy"),
    t.Literal("sad"),
    t.Literal("angry"),
    t.Literal("anxious"),
    t.Literal("neutral"),
  ]),
  reasons: t.Optional(t.Array(t.String({ minLength: 1, maxLength: 80 }), { maxItems: 5 })),
  customReason: t.Optional(t.String({ maxLength: 300 })),
});

export const emotionStatsQuery = t.Object({
  deviceId: t.String({ minLength: 6, maxLength: 128 }),
  weekOffset: t.Optional(t.Numeric({ minimum: 0, maximum: 12 })),
});

export const emotionHistoryQuery = t.Object({
  deviceId: t.String({ minLength: 6, maxLength: 128 }),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50 })),
});
