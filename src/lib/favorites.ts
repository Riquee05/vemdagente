export const FAVORITES_KEY = "vemdagente-favorites-v1";
export const MAX_FAVORITES = 200;
export function parseFavorites(raw: string | null): string[] {
  try {
    const values: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(values)) return [];
    return [
      ...new Set(
        values.filter(
          (value): value is string =>
            typeof value === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
        ),
      ),
    ].slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}
export function institutionShareText(
  point: { id: string; name: string; address: string | null; city: string },
  origin: string,
): string {
  return `${point.name}\n${point.address ?? point.city}\n${origin}/pontos/${encodeURIComponent(point.id)}\nConfirme diretamente com a instituição antes de ir.`;
}
