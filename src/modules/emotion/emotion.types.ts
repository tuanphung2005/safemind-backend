import { Emotion as PrismaEmotion } from "@prisma/client";

export const emotionValues = [
  "happy",
  "sad",
  "angry",
  "anxious",
  "neutral",
] as const;

export type EmotionValue = (typeof emotionValues)[number];

export const emotionToPrisma: Record<EmotionValue, PrismaEmotion> = {
  happy: PrismaEmotion.HAPPY,
  sad: PrismaEmotion.SAD,
  angry: PrismaEmotion.ANGRY,
  anxious: PrismaEmotion.ANXIOUS,
  neutral: PrismaEmotion.NEUTRAL,
};

export const prismaToEmotion: Record<PrismaEmotion, EmotionValue> = {
  [PrismaEmotion.HAPPY]: "happy",
  [PrismaEmotion.SAD]: "sad",
  [PrismaEmotion.ANGRY]: "angry",
  [PrismaEmotion.ANXIOUS]: "anxious",
  [PrismaEmotion.NEUTRAL]: "neutral",
};

export interface EmotionCheckinInput {
  deviceId: string;
  emotion: EmotionValue;
  reasons: string[];
  customReason?: string;
}

export interface EmotionCheckinResult {
  checkinId: string;
  anonymousId: string;
  reflection: string;
  microAction: string;
  fallbackUsed: boolean;
  createdAt: string;
}
