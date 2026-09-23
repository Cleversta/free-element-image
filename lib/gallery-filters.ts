export const sceneCategories = [
  "nature",
  "mountains",
  "forest",
  "beach",
  "countryside",
  "desert",
  "city",
  "other",
] as const;
export function galleryFilters(q: unknown, category: unknown) {
  return {
    q: typeof q === "string" ? q.trim().slice(0, 100) : "",
    category:
      typeof category === "string" &&
      sceneCategories.some((c) => c === category)
        ? category
        : "",
  };
}
export function galleryPageHref(page: number, q: string, category: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (page > 1) params.set("page", String(page));
  return `/gallery${params.size ? `?${params}` : ""}`;
}
