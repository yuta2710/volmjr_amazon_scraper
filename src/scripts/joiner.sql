SELECT
    bp.id,
    bp.asin,
    bp.url,
    bp.image,
    bp.title,
    bp.price->>'amount' AS amount,
    bp.price->>'currency' AS currency,
    bp.price->>'displayAmount' AS displayAmount,
    bp.price->>'originalPrice' AS originalPrice,
    bp.price->>'priceHistory' AS priceHistory,
    bp.price->>'savings' AS savings,
    bp.category,
    bp.number_of_comments AS "numberOfComments",
    bp.average_rating AS "averageRating",
    bp.is_out_of_stock AS "isOutOfStock",
    bp.brand,
    bp.retailer,
    bp.best_seller_ranks AS "bestSellerRanks",
    bp.is_amazon_choice AS "isAmazonChoice",
    bp.is_best_seller AS "isBestSeller",
    bp.histogram,
    bp.delivery_location AS "deliveryLocation",
    bp.sales_volume_last_month AS "salesVolumeLastMonth",
    bp.average_sentiment_analysis AS "averageSentimentAnalysis",
    bp.business_target_for_collecting AS "businessTargetForCollecting",
    bp.created_at AS "createdAt",
    bp.updated_at AS "updatedAt"
FROM
    base_products bp
INNER JOIN
    user_products up ON bp.id = up.product_id
WHERE
    up.user_id = $1;
