const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const nodeEnv = process.env.NODE_ENV ?? "development";

export const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: parseNumber(process.env.PORT, 3000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/safemind",
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
  geminiTimeoutMs: parseNumber(process.env.GEMINI_TIMEOUT_MS, 8000),
  aiRetries: parseNumber(process.env.AI_RETRIES, 2),
  scenarioLowWatermark: parseNumber(process.env.SCENARIO_LOW_WATERMARK, 12),
};
