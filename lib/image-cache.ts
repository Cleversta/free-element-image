// Only browser thumbnails get a short cache. Originals/downloads still recheck
// publication on every request, and shared proxies must never retain images.
export function imageCacheControl(variant: string) {
  return variant === "thumbnail"
    ? "private, max-age=60, must-revalidate"
    : "no-store";
}
