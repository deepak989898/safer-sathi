/** Remove Sources / external-reference sections from published blog content. */
export function stripSourcesSection(markdown: string): string {
  const chunks = markdown.split(/(?=^##\s)/m);
  const kept = chunks.filter((chunk) => {
    const trimmed = chunk.trim();
    if (!trimmed) return false;
    const match = trimmed.match(/^##\s+(.+?)(?:\n|$)/);
    if (!match) return true;
    const key = match[1].toLowerCase().replace(/\s+/g, " ").trim();
    return (
      !key.includes("sources") &&
      !key.includes("further reading") &&
      key !== "references" &&
      key !== "external links"
    );
  });
  return kept.join("").trim();
}
