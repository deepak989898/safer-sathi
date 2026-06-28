import OpenAI from "openai";

/** dall-e-2 512×512 — lowest-cost OpenAI image option suitable for blog heroes. */
export const OPENAI_IMAGE_MODEL = (process.env.OPENAI_IMAGE_MODEL ?? "dall-e-2").trim();

export const OPENAI_IMAGE_SIZE = (process.env.OPENAI_IMAGE_SIZE ?? "512x512") as
  | "256x256"
  | "512x512"
  | "1024x1024"
  | "1536x1024"
  | "1024x1536"
  | "auto";

/** Approximate USD cost per image (dall-e-2 512×512). */
export const OPENAI_IMAGE_ESTIMATED_COST_USD = Number(
  process.env.OPENAI_IMAGE_ESTIMATED_COST_USD ?? "0.018"
);

export function isOpenAIImagesConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function isGptImageModel(model: string): boolean {
  const normalized = model.toLowerCase();
  return normalized.startsWith("gpt-image") || normalized.includes("gpt_image");
}

/** GPT Image models reject 512×512 — use smallest supported size. */
function resolveImageSize(model: string): OpenAI.Images.ImageGenerateParams["size"] {
  if (!isGptImageModel(model)) {
    return OPENAI_IMAGE_SIZE as OpenAI.Images.ImageGenerateParams["size"];
  }
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

/**
 * Generate one blog hero image.
 * Never sends `response_format` — gpt-image-* models reject it; DALL-E returns a URL by default.
 */
export async function generateOpenAIImage(prompt: string): Promise<Buffer> {
  const client = getClient();
  const model = OPENAI_IMAGE_MODEL;
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
