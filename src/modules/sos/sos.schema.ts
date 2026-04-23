import { t } from "elysia";

export const sosReportBody = t.Object({
  deviceId: t.String({ minLength: 6, maxLength: 128 }),
  situation: t.String({ minLength: 5, maxLength: 1500 }),
});

export const sosGetParams = t.Object({
  id: t.String({ minLength: 8, maxLength: 64 }),
});

export const sosGetQuery = t.Object({
  deviceId: t.String({ minLength: 6, maxLength: 128 }),
});
