import { User } from "@/modules/user/user.types";

export type PriceHistoryItem = {
  price: number;
};

export type BaseProduct = {
  url: string;
  currency: string;
  image: string;
  title: string;
  price: BaseProductPrice;
  description: string;
  category: string;
  numberOfComments: number;
  averageRating: number;
  isOutOfStock: Boolean;
  brand: string;
  retailer: string | "Not Show";
  bestSellerRanks: [];
  histogram: {
    "1 star": string, 
    "2 star": string, 
    "3 star": string, 
    "4 star": string, 
    "5 star": string
  }, 
  deliveryLocation: string;
  salesVolumeLastMonth: string | "Not Show";
  averageSentimentAnalysis: BaseSentiment;
  // users?: User[];
};

export type BaseProductPrice = {
  amount: number;
  currency: string;
  displayAmount: string;
  currentPrice: number;
  originalPrice: number;
  highestPrice: number;
  lowestPrice: number;
  savings: {
    amount: number;
    currency: string;
    displayAmount: string; // "$34.77"
    percentage: string; // "40%"
  }
}

export type CommentItem = {
  title: string;
  content: string;
  date: Date;
  product: {
    id: string;
    asin: string;
    name: string;
    category: string;
  },
  helpfulCount: number;
  rating: string;
  verifiedPurchase: boolean;
  location: string;
  url: string;
  nextPage: string;
  sentiment: BaseSentiment;
}

export type BaseSentiment = {
  score: number;
  emotion: string;
}