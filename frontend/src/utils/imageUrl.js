export function getSafeImageUrl(imageUrl) {
  const url = String(imageUrl || "").trim();

  if (!url || url.startsWith("file://") || /^[a-zA-Z]:[\\/]/.test(url)) {
    return null;
  }

  return url;
}
