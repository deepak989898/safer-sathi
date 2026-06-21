/** Build descriptive alt text for catalog and marketing images */
export function buildImageAlt(subject: string, context?: string): string {
  const label = subject.trim();
  if (!label) return "Safar Sathi travel";
  if (context?.trim()) return `${label} — ${context.trim()} | Safar Sathi`;
  return `${label} | Safar Sathi`;
}

/** Image title attribute for accessibility and SEO */
export function buildImageTitle(subject: string, context?: string): string {
  return buildImageAlt(subject, context);
}

/** Next/Image props with lazy loading and optional title */
export function seoImageProps(input: {
  alt: string;
  title?: string;
  priority?: boolean;
}) {
  return {
    alt: input.alt,
    title: input.title ?? input.alt,
    loading: input.priority ? ("eager" as const) : ("lazy" as const),
  };
}
