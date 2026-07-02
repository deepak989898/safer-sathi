import OpenAI from "openai";

/** DALL-E was retired May 2026 — use GPT Image family. */
export const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-1";

const ECONOMY_OPENAI_IMAGE_MODEL = "gpt-image-1-mini";

const LEGACY_DALLE_MODELS = new Set(["dall-e-2", "dall-e-3"]);

export type OpenAiImageQuality = "low" | "medium" | "high";
export type OpenAiImageSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";

export interface OpenAiImageGenerateOptions {
  model?: string;
  quality?: OpenAiImageQuality;
  size?: OpenAiImageSize;
}

function normalizeConfiguredModel(raw?: string): string {
  const configured = (raw ?? DEFAULT_OPENAI_IMAGE_MODEL).trim();
  if (LEGACY_DALLE_MODELS.has(configured.toLowerCase())) {
    return DEFAULT_OPENAI_IMAGE_MODEL;
  }
  return configured;
}

export const OPENAI_IMAGE_MODEL = normalizeConfiguredModel(process.env.OPENAI_IMAGE_MODEL);

export const OPENAI_IMAGE_SIZE = (process.env.OPENAI_IMAGE_SIZE ?? "1536x1024") as OpenAiImageSize;

export const OPENAI_IMAGE_QUALITY = normalizeQuality(process.env.OPENAI_IMAGE_QUALITY);

function normalizeQuality(raw?: string): OpenAiImageQuality {
  const value = (raw ?? "high").toLowerCase();
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "high";
}

/** Landscape 1536×1024 list prices (USD) from OpenAI docs. */
const COST_USD_LANDSCAPE: Record<string, Record<OpenAiImageQuality, number>> = {
  "gpt-image-1": { low: 0.016, medium: 0.063, high: 0.25 },
  "gpt-image-1-mini": { low: 0.006, medium: 0.015, high: 0.052 },
};

export function estimateOpenAiImageCostUsd(options?: OpenAiImageGenerateOptions): number {
  const model = resolveModel(options?.model);
  const quality = options?.quality ?? OPENAI_IMAGE_QUALITY;
  const table = COST_USD_LANDSCAPE[model] ?? COST_USD_LANDSCAPE[DEFAULT_OPENAI_IMAGE_MODEL];
  return table[quality] ?? table.high;
}

/** @deprecated Use estimateOpenAiImageCostUsd — kept for older imports. */
export const OPENAI_IMAGE_ESTIMATED_COST_USD = estimateOpenAiImageCostUsd();

function resolveModel(model?: string): string {
  const configured = normalizeConfiguredModel(model ?? OPENAI_IMAGE_MODEL);
  if (configured === ECONOMY_OPENAI_IMAGE_MODEL) {
    return ECONOMY_OPENAI_IMAGE_MODEL;
  }
  return configured.startsWith("gpt-image") ? configured : DEFAULT_OPENAI_IMAGE_MODEL;
}

function buildModelFallbackChain(preferred?: string): string[] {
  const primary = resolveModel(preferred);
  return [primary, DEFAULT_OPENAI_IMAGE_MODEL, ECONOMY_OPENAI_IMAGE_MODEL].filter(
    (model, index, list) => list.indexOf(model) === index
  );
}

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

function resolveImageSize(
  model: string,
  requested?: OpenAiImageSize
): OpenAI.Images.ImageGenerateParams["size"] {
  const size = requested ?? OPENAI_IMAGE_SIZE;

  if (isGptImageModel(model)) {
    if (
      size === "1024x1024" ||
      size === "1536x1024" ||
      size === "1024x1536" ||
      size === "auto"
    ) {
      return size;
    }
    return "1536x1024";
  }

  if (isDalleModel(model)) {
    return size as OpenAI.Images.ImageGenerateParams["size"];
  }

  return "1536x1024";
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
  prompt: string,
  options?: OpenAiImageGenerateOptions
): Promise<Buffer> {
  const size = resolveImageSize(model, options?.size);
  const quality = options?.quality ?? OPENAI_IMAGE_QUALITY;

  const response = isGptImageModel(model)
    ? await client.images.generate({
        model,
        prompt,
        n: 1,
        size,
        quality,
        output_format: "png",
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
 * Defaults: gpt-image-1, high quality, 1536×1024 landscape.
 */
export async function generateOpenAIImage(
  prompt: string,
  options?: OpenAiImageGenerateOptions
): Promise<Buffer> {
  const client = getClient();
  let lastError: Error | undefined;

  for (const model of buildModelFallbackChain(options?.model)) {
    try {
      return await generateWithModel(client, model, prompt, options);
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
