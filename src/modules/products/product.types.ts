import CategoryNode from "@/shared/category";

export type PriceHistoryItem = {
  price: number;
};

export type BaseProduct = {
  asin?: string;
  url?: string;
  image?: string;
  title?: string;
  price?: {
    amount?: number | 0;
    currency?: string | "$";
    displayAmount?: string | "";
    currentPrice?: number | 0;
    originalPrice?: number | 0;
    highestPrice?: number | 0;
    lowestPrice?: number | 0;
    savings?: {
      amount?: number | 0;
      currency?: string | "";
      displayAmount?: string | ""; // "$34.77 with 40%"
      percentage?: string | ""; // "40%"
    };
  };
  category?: number;
  numberOfComments?: number;
  averageRating?: number;
  isOutOfStock?: boolean;
  brand?: string;
  retailer?: string | "Not show";
  bestSellerRanks?: BestSellerRank[];
  isAmazonChoice?: boolean;
  isBestSeller?: boolean;
  histogram?: { [key: string]: string };
  deliveryLocation?: string;
  salesVolumeLastMonth?: string | "Not show";
  averageSentimentAnalysis?: {
    score: number;
    emotion: string;
  };
  businessTargetForCollecting?: string;
};

export type BestSellerRank = {
  rank?: string;
  categoryMarket?: string;
}

export type CommentItem = {
  title: string;
  content: string;
  date: string;
  productId?: number;
  helpfulCount: string;
  rating: string;
  isVerifiedPurchase: boolean;
  location: string;
  url: string;
  sentiment: {
    score: number;
    emotion: string;
  };
  pagination?: {
   totalRecords?: number,
   currentPage?: number,
   nextPage?: {
    url?: string;
    metric?: number;
   },
   prevPage?: {
    url?: string;
    metric?: number;
   },  
 }
};

export type ProductHistogram = {
  "5 star": string;
  "4 star": string;
  "3 star": string;
  "2 star": string;
  "1 star": string;
};

export type AmazonScrapedResponse = {
  product: BaseProduct,
  comments: CommentItem[],
  category: CategoryNode
}
// export type BaseSentiment = {
//   score: number;
//   emotion: string;
// }

// export type BaseProductPrice = {
//   amount: number;
//   currency: string;
//   displayAmount: string;
//   currentPrice: number;
//   originalPrice: number;
//   highestPrice: number;
//   lowestPrice: number;
//   savings: {
//     amount: number;
//     currency: string;
//     displayAmount: string; // "$34.77"
//     percentage: string; // "40%"
//   }
// }
