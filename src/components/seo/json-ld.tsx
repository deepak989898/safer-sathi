type JsonLdObject = Record<string, unknown>;
type JsonLdData =
  | JsonLdObject
  | (JsonLdObject | null | undefined)[]
  | null
  | undefined;

interface JsonLdProps {
  data: JsonLdData;
}

export function JsonLd({ data }: JsonLdProps) {
  if (!data) return null;
  const payload = Array.isArray(data) ? data.filter(Boolean) : [data];
  if (!payload.length) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload.length === 1 ? payload[0] : payload) }}
    />
  );
}
