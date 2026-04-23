import { SosLevel as PrismaSosLevel } from "@prisma/client";

export type SosLevelValue = "level1" | "level2" | "level3";

export const sosToPrisma: Record<SosLevelValue, PrismaSosLevel> = {
  level1: PrismaSosLevel.LEVEL1,
  level2: PrismaSosLevel.LEVEL2,
  level3: PrismaSosLevel.LEVEL3,
};

export const prismaToSos: Record<PrismaSosLevel, SosLevelValue> = {
  [PrismaSosLevel.LEVEL1]: "level1",
  [PrismaSosLevel.LEVEL2]: "level2",
  [PrismaSosLevel.LEVEL3]: "level3",
};
