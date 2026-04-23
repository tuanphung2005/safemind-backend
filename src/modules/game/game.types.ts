import { GameRole as PrismaGameRole } from "@prisma/client";

export type GameRoleValue = "supporter" | "bystander" | "defender";

export const roleToPrisma: Record<GameRoleValue, PrismaGameRole> = {
  supporter: PrismaGameRole.SUPPORTER,
  bystander: PrismaGameRole.BYSTANDER,
  defender: PrismaGameRole.DEFENDER,
};

export const prismaToRole: Record<PrismaGameRole, GameRoleValue> = {
  [PrismaGameRole.SUPPORTER]: "supporter",
  [PrismaGameRole.BYSTANDER]: "bystander",
  [PrismaGameRole.DEFENDER]: "defender",
};
