export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function computeSeoScore(input: {
  searchVolume: number;
  competition: "low" | "medium" | "high";
  trendScore: number;
}): number {
  const competitionScore =
    input.competition === "low" ? 90 : input.competition === "medium" ? 65 : 40;
  const volumeScore = Math.min(100, Math.round(input.searchVolume / 500));
  const trend = Math.min(100, input.trendScore);
  return Math.round(competitionScore * 0.4 + volumeScore * 0.35 + trend * 0.25);
}

export function estimateWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
