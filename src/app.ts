import { Elysia } from "elysia";

import { emotionRoutes } from "./modules/emotion/emotion.routes";
import { gameRoutes } from "./modules/game/game.routes";
import { healthRoutes } from "./modules/health/health.routes";
import { orchestrationRoutes } from "./modules/orchestration/orchestration.routes";
import { sessionRoutes } from "./modules/session/session.routes";
import { sosRoutes } from "./modules/sos/sos.routes";
import { AppError, normalizeError } from "./shared/http/errors";
import { fail, ok } from "./shared/http/response";

export const createApp = () => {
  const api = new Elysia({ prefix: "/api/v1" })
    .use(healthRoutes)
    .use(sessionRoutes)
    .use(emotionRoutes)
    .use(sosRoutes)
    .use(gameRoutes)
    .use(orchestrationRoutes);

  return new Elysia()
    .get("/", () =>
      ok({
        service: "safemind-backend",
        message: "SafeMind backend is running",
      })
    )
    .use(api)
    .onError(({ code, error, set }) => {
      if (String(code).startsWith("VALIDATION")) {
        set.status = 422;
        return fail("VALIDATION_ERROR", "Validation failed", error);
      }

      if (code === "NOT_FOUND") {
        set.status = 404;
        return fail("NOT_FOUND", "Route not found");
      }

      const normalized = normalizeError(error);
      set.status = normalized.status;

      if (normalized.status >= 500 && !(error instanceof AppError)) {
        return fail("INTERNAL_ERROR", "Internal server error");
      }

      return fail(normalized.code, normalized.message, normalized.details);
    });
};
