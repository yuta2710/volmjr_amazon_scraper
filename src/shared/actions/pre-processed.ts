// pre-processed.ts

export function cleanPrice(price: string | null): number | null {
  if (!price) return null;
  // Remove any non-numeric characters like currency symbols and commas
  const cleanedPrice = parseFloat(price.replace(/[^0-9.-]+/g, ''));
  return isNaN(cleanedPrice) ? null : cleanedPrice;
}

export function cleanTitle(title: string | null): string {
  return title?.trim() || 'Unknown Product';
}

export function cleanRating(rating: string | null): number | null {
  if (!rating) return null;
  // Extract the numeric part of the rating
  const match = rating.match(/([0-9.]+)/);
  return match ? parseFloat(match[1]) : null;
}

export function transformData(product: any) {
  return {
      title: cleanTitle(product.title),
      price: cleanPrice(product.price),
      image: product.image,
      rating: cleanRating(product.rating),
  };
}
