import { Elysia } from "elysia";

import { ok } from "../../shared/http/response";
import { sosGetParams, sosGetQuery, sosReportBody } from "./sos.schema";
import { sosService } from "./sos.service";

export const sosRoutes = new Elysia({ prefix: "/sos" })
  .post(
    "/report",
    async ({ body }) => {
      const report = await sosService.createReport(body.deviceId, body.situation);
      return ok(report);
    },
    {
      body: sosReportBody,
    }
  )
  .get(
    "/report/:id",
    async ({ params, query }) => {
      const report = await sosService.getReportById(query.deviceId, params.id);
      return ok(report);
    },
    {
      params: sosGetParams,
      query: sosGetQuery,
    }
  );
