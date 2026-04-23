import { Elysia, t } from "elysia";

import { ok } from "../../shared/http/response";
import { resolveUserFromDevice } from "./session.service";

const sessionStartBody = t.Object({
  deviceId: t.String({ minLength: 6, maxLength: 128 }),
});

export const sessionRoutes = new Elysia({ prefix: "/session" }).post(
  "/start",
  async ({ body }) => {
    const resolved = await resolveUserFromDevice(body.deviceId);

    return ok({
      anonymousId: resolved.anonymousId,
      createdAt: resolved.user.createdAt,
    });
  },
  {
    body: sessionStartBody,
  }
);
