import { t } from "elysia";

export const recommendationQuery = t.Object({
  deviceId: t.String({ minLength: 6, maxLength: 128 }),
});
