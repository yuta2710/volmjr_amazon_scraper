export type PriceHistoryItem = {
  price: number;
};

export type BaseProduct = {
  asin: string;
  url: string;
  image?: string;
  title: string;
  price: {
    amount: number;
    currency: string;
    displayAmount: string;
    currentPrice: number;
    originalPrice: number;
    highestPrice: number;
    lowestPrice: number;
    savings?: {
      amount: number;
      currency: string;
      displayAmount: string; // "$34.77 with 40%"
      percentage: string; // "40%"
    };
  };
  category: string;
  numberOfComments?: number;
  averageRating?: number;
  isOutOfStock?: Boolean;
  brand?: string;
  retailer: string | "Not Show";
  bestSellerRanks?: [];
  histogram: { [key: string]: string },
  deliveryLocation: string;
  salesVolumeLastMonth: string | "Not Show";
  averageSentimentAnalysis?: {
    score: number;
    emotion: string;
  };
  businessTargetForCollecting: string;
};

export type CommentItem = {
  title: string;
  content: string;
  date: Date;
  product: {
    id: string;
    asin: string;
    name: string;
    category: string;
  };
  helpfulCount: number;
  rating: string;
  verifiedPurchase: boolean;
  location: string;
  url: string;
  nextPage: string;
  sentiment: {
    score: number;
    emotion: string;
  };
};

export type ProductHistogram = {
  "5 star": string;
  "4 star": string;
  "3 star": string;
  "2 star": string;
  "1 star": string;
};

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
