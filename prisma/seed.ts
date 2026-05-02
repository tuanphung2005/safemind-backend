import { PrismaClient } from "@prisma/client";

import { fallbackScenarios } from "../src/modules/game/game.fallback";
import { roleToPrisma } from "../src/modules/game/game.types";

const prisma = new PrismaClient();

const main = async () => {
  for (const scenario of fallbackScenarios) {
    const exists = await prisma.gameScenario.findFirst({
      where: {
        title: scenario.title,
      },
    });

    if (exists) {
      continue;
    }

    await prisma.gameScenario.create({
      data: {
        title: scenario.title,
        description: scenario.description,
        isAiGenerated: false,
        choices: {
          create: scenario.choices.map((choice) => ({
            text: choice.text,
            role: roleToPrisma[choice.role],
            feedback: choice.feedback,
          })),
        },
      },
    });
  }
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
