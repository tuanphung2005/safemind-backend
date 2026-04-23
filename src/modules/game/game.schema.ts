import { t } from "elysia";

export const gameScenarioQuery = t.Object({
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 10 })),
});

export const gameSubmitParams = t.Object({
  scenarioId: t.String({ minLength: 8, maxLength: 64 }),
});

export const gameSubmitBody = t.Object({
  deviceId: t.String({ minLength: 6, maxLength: 128 }),
  choiceId: t.String({ minLength: 8, maxLength: 64 }),
});

export const gameProfileQuery = t.Object({
  deviceId: t.String({ minLength: 6, maxLength: 128 }),
});
