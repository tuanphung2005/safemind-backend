export type GameRoleValue = "supporter" | "bystander" | "defender";

export interface EmotionReflectionRequest {
  emotion: "happy" | "sad" | "angry" | "anxious" | "neutral";
  reasons: string[];
  customReason?: string;
}

export interface EmotionReflectionResult {
  reflection: string;
  microAction: string;
}

export interface ScenarioChoiceDraft {
  text: string;
  role: GameRoleValue;
  feedback: string;
}

export interface ScenarioDraft {
  title: string;
  description: string;
  choices: ScenarioChoiceDraft[];
}

export interface ScenarioGenerationRequest {
  count: number;
}
