"use strict";
// pre-processed.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanPrice = cleanPrice;
exports.cleanTitle = cleanTitle;
exports.cleanRating = cleanRating;
exports.transformData = transformData;
function cleanPrice(price) {
    if (!price)
        return null;
    // Remove any non-numeric characters like currency symbols and commas
    const cleanedPrice = parseFloat(price.replace(/[^0-9.-]+/g, ''));
    return isNaN(cleanedPrice) ? null : cleanedPrice;
}
function cleanTitle(title) {
    return title?.trim() || 'Unknown Product';
}
function cleanRating(rating) {
    if (!rating)
        return null;
    // Extract the numeric part of the rating
    const match = rating.match(/([0-9.]+)/);
    return match ? parseFloat(match[1]) : null;
}
function transformData(product) {
    return {
        title: cleanTitle(product.title),
        price: cleanPrice(product.price),
        image: product.image,
        rating: cleanRating(product.rating),
    };
}
//# sourceMappingURL=pre-processed.js.map