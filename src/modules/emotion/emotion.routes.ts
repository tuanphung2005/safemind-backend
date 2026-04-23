import { Elysia } from "elysia";

import { ok } from "../../shared/http/response";
import {
  emotionCheckinBody,
  emotionHistoryQuery,
  emotionStatsQuery,
} from "./emotion.schema";
import { emotionService } from "./emotion.service";

export const emotionRoutes = new Elysia({ prefix: "/emotions" })
  .post(
    "/checkin",
    async ({ body }) => {
      const result = await emotionService.createCheckin({
        deviceId: body.deviceId,
        emotion: body.emotion,
        reasons: body.reasons ?? [],
        customReason: body.customReason,
      });

      return ok(result);
    },
    {
      body: emotionCheckinBody,
    }
  )
  .get(
    "/weekly-stats",
    async ({ query }) => {
      const result = await emotionService.getWeeklyStats(
        query.deviceId,
        query.weekOffset ?? 0
      );

      return ok(result);
    },
    {
      query: emotionStatsQuery,
    }
  )
  .get(
    "/history",
    async ({ query }) => {
      const result = await emotionService.getHistory(query.deviceId, query.limit ?? 20);
      return ok({ entries: result });
    },
    {
      query: emotionHistoryQuery,
    }
  );
