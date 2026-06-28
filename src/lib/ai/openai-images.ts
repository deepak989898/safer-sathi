import OpenAI from "openai";

/** DALL-E was retired May 2026 — use GPT Image family. */
export const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-1-mini";

const LEGACY_DALLE_MODELS = new Set(["dall-e-2", "dall-e-3"]);

function normalizeConfiguredModel(raw?: string): string {
  const configured = (raw ?? DEFAULT_OPENAI_IMAGE_MODEL).trim();
  if (LEGACY_DALLE_MODELS.has(configured.toLowerCase())) {
    return DEFAULT_OPENAI_IMAGE_MODEL;
  }
  return configured;
}

export const OPENAI_IMAGE_MODEL = normalizeConfiguredModel(process.env.OPENAI_IMAGE_MODEL);

export const OPENAI_IMAGE_SIZE = (process.env.OPENAI_IMAGE_SIZE ?? "1024x1024") as
  | "256x256"
  | "512x512"
  | "1024x1024"
  | "1536x1024"
  | "1024x1536"
  | "auto";

/** Approximate USD cost per image (gpt-image-1-mini, low quality). */
export const OPENAI_IMAGE_ESTIMATED_COST_USD = Number(
  process.env.OPENAI_IMAGE_ESTIMATED_COST_USD ?? "0.02"
);

const IMAGE_MODEL_FALLBACK_CHAIN = [
  OPENAI_IMAGE_MODEL,
  DEFAULT_OPENAI_IMAGE_MODEL,
  "gpt-image-1",
].filter((model, index, list) => list.indexOf(model) === index);

export function isOpenAIImagesConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function isGptImageModel(model: string): boolean {
  const normalized = model.toLowerCase();
  return normalized.startsWith("gpt-image") || normalized.includes("gpt_image");
}

function isDalleModel(model: string): boolean {
  return LEGACY_DALLE_MODELS.has(model.toLowerCase());
}

/** GPT Image models reject 512×512 — use smallest supported size. */
function resolveImageSize(model: string): OpenAI.Images.ImageGenerateParams["size"] {
  if (isGptImageModel(model)) {
    if (
      OPENAI_IMAGE_SIZE === "1024x1024" ||
      OPENAI_IMAGE_SIZE === "1536x1024" ||
      OPENAI_IMAGE_SIZE === "1024x1536" ||
      OPENAI_IMAGE_SIZE === "auto"
    ) {
      return OPENAI_IMAGE_SIZE;
    }
    return "1024x1024";
  }

  if (isDalleModel(model)) {
    return OPENAI_IMAGE_SIZE as OpenAI.Images.ImageGenerateParams["size"];
  }

  return "1024x1024";
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }
  return new OpenAI({ apiKey });
}

async function bufferFromImageItem(item: OpenAI.Images.Image | undefined): Promise<Buffer> {
  if (!item) {
    throw new Error("OpenAI returned no image data");
  }

  if (item.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }

  if (item.url) {
    const res = await fetch(item.url);
    if (!res.ok) {
      throw new Error(`Failed to download OpenAI image (${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  throw new Error("OpenAI returned no image data");
}

function isRetryableModelError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("invalid model") ||
    lower.includes("model_not_found") ||
    lower.includes("no longer supported")
  );
}

async function generateWithModel(
  client: OpenAI,
  model: string,
  prompt: string
): Promise<Buffer> {
  const size = resolveImageSize(model);

  const response = isGptImageModel(model)
    ? await client.images.generate({
        model,
        prompt,
        n: 1,
        size,
        quality: "low",
      })
    : await client.images.generate({
        model,
        prompt,
        n: 1,
        size,
      });

  return bufferFromImageItem(response.data?.[0]);
}

/**
 * Generate one blog hero image.
 * Uses GPT Image models (DALL-E retired). Falls back if configured model is unavailable.
 */
export async function generateOpenAIImage(prompt: string): Promise<Buffer> {
  const client = getClient();
  let lastError: Error | undefined;

  for (const model of IMAGE_MODEL_FALLBACK_CHAIN) {
    try {
      return await generateWithModel(client, model, prompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = error instanceof Error ? error : new Error(message);
      if (!isRetryableModelError(message)) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error("OpenAI image generation failed — no supported model available");
}
