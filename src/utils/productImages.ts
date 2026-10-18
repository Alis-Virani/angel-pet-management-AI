export function getProductImageUrl(product: { imageUrl?: string }): string | undefined {
  const imageUrl = product.imageUrl?.trim();
  return imageUrl || undefined;
}
