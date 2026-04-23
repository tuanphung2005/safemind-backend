import { Elysia } from "elysia";

import { ok } from "../../shared/http/response";
import {
  gameProfileQuery,
  gameScenarioQuery,
  gameSubmitBody,
  gameSubmitParams,
} from "./game.schema";
import { gameService } from "./game.service";

export const gameRoutes = new Elysia({ prefix: "/game" })
  .get(
    "/scenarios",
    async ({ query }) => {
      const scenarios = await gameService.getScenarios(query.limit ?? 5);
      return ok({ scenarios });
    },
    {
      query: gameScenarioQuery,
    }
  )
  .post(
    "/scenario/:scenarioId/submit",
    async ({ params, body }) => {
      const result = await gameService.submitChoice(
        body.deviceId,
        params.scenarioId,
        body.choiceId
      );

      return ok(result);
    },
    {
      params: gameSubmitParams,
      body: gameSubmitBody,
    }
  )
  .get(
    "/profile/badges",
    async ({ query }) => {
      const profile = await gameService.getProfile(query.deviceId);
      return ok(profile);
    },
    {
      query: gameProfileQuery,
    }
  );
