import OpenAI from "openai";

/** dall-e-2 512×512 — lowest-cost OpenAI image option suitable for blog heroes. */
export const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "dall-e-2";
export const OPENAI_IMAGE_SIZE = (process.env.OPENAI_IMAGE_SIZE ?? "512x512") as
  | "256x256"
  | "512x512"
  | "1024x1024";

/** Approximate USD cost per image (dall-e-2 512×512). */
export const OPENAI_IMAGE_ESTIMATED_COST_USD = Number(
  process.env.OPENAI_IMAGE_ESTIMATED_COST_USD ?? "0.018"
);

export function isOpenAIImagesConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }
  return new OpenAI({ apiKey });
}

/** Generate exactly one standard-quality image (no variations). */
export async function generateOpenAIImage(prompt: string): Promise<Buffer> {
  const client = getClient();

  const response = await client.images.generate({
    model: OPENAI_IMAGE_MODEL,
    prompt,
    n: 1,
    size: OPENAI_IMAGE_SIZE,
    response_format: "b64_json",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI returned no image data");
  }

  return Buffer.from(b64, "base64");
}
