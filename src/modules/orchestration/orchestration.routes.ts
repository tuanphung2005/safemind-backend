import { Elysia } from "elysia";

import { ok } from "../../shared/http/response";
import { recommendationQuery } from "./orchestration.schema";
import { orchestrationService } from "./orchestration.service";

export const orchestrationRoutes = new Elysia({ prefix: "/user" }).get(
  "/recommendations",
  async ({ query }) => {
    const recommendation = await orchestrationService.getRecommendation(query.deviceId);
    return ok(recommendation);
  },
  {
    query: recommendationQuery,
  }
);
