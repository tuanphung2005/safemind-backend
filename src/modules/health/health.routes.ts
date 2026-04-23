import { Elysia } from "elysia";

import { ok } from "../../shared/http/response";

export const healthRoutes = new Elysia({ prefix: "/health" })
  .get("", () =>
    ok({
      status: "ok",
      service: "safemind-backend",
      timestamp: new Date().toISOString(),
    })
  );
