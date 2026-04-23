import { prisma } from "../../config/db";
import { sanitizeText } from "../../shared/safety/content-filter";
import { toAnonymousId } from "../../shared/utils/hash";
import { AppError } from "../../shared/http/errors";

const normalizeDeviceId = (deviceId: string): string =>
  sanitizeText(deviceId, 128);

export const resolveUserFromDevice = async (deviceId: string) => {
  const normalizedDeviceId = normalizeDeviceId(deviceId);

  if (!normalizedDeviceId) {
    throw new AppError("BAD_REQUEST", "deviceId is required", 400);
  }

  const anonymousId = toAnonymousId(normalizedDeviceId);

  const user = await prisma.userProfile.upsert({
    where: {
      anonymousId,
    },
    update: {
      deviceHash: anonymousId,
    },
    create: {
      anonymousId,
      deviceHash: anonymousId,
    },
  });

  return {
    user,
    anonymousId,
  };
};
