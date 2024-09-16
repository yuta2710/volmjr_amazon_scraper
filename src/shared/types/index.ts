import { SupabaseClient } from '@supabase/supabase-js'
import { CategoryNode } from "../../modules/category/category.model";
import { Database, Tables, TablesInsert } from "./database.types";
import { UserRole } from '../constants';

export declare type BaseProductInsert = TablesInsert<"base_products">;
export declare type BaseCommentInsert = TablesInsert<"comments">;
export declare type BaseCategoryInsert = TablesInsert<"category">;
export declare type UserProfileInsert = TablesInsert<"user_profiles">;
export declare type UserProductInsert = TablesInsert<"user_products">;
export declare type ProductCategoriesInsert = TablesInsert<"product_categories">;

export type TypedSupabaseClient = SupabaseClient<Database>

export type PriceHistoryItem = {
  price: number;
};

export type BaseProduct = {
  id?: number;
  asin?: string;
  url?: string;
  image?: string;
  title?: string;
  price?: {
    amount?: number | 0;
    currency?: string | "$";
    displayAmount?: string | "";
    originalPrice?: number | 0;
    priceHistory?: CamelPriceComparison;
    savings?: {
      amount?: number | 0;
      currency?: string | "";
      displayAmount?: string | ""; // "$34.77 with 40%"
      percentage?: string | ""; // "40%"
    };
  };
  // price?: Record<string, any>;
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
  createdAt?: Date;
  updatedAt?: Date; 
  userId?: number; // foreign key
} | null;

export type BaseProductDto = {
  id?: number;
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
    averagePrice?: number | 0;
    savings?: {
      amount?: number | 0;
      currency?: string | "";
      displayAmount?: string | ""; // "$34.77 with 40%"
      percentage?: string | ""; // "40%"
    };
  };
  category?: CategoryProps[];
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
  createdAt?: Date;
  updatedAt?: Date;
  userId?: number; 
} | null;

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
  product: BaseProduct | null,
  comments: CommentItem[] | null,
  category: CategoryNode | null
}

export type CategoryProps ={
  id?: string;
  name?: string;
  lft?: number;
  rgt?: number;
  parent_id?: number;
}

export type CamelPriceComparison = {
  lowestPrice?: {
    latestDate: string;
    value: number | 0;
  };
  highestPrice?: {
    latestDate: string;
    value: number | 0;
  };
  currentPrice?: {
    latestDate: string;
    value: number | 0;
  };
  averagePrice?: number | 0;
}

export type AuthenticationRequest = { 
  email: string;
  password: string; 
}

export type CoreUser = {
  id?: number;
  authId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  workspaces?: string[];
  products?: BaseProduct[];
  createdAt?: Date
  updatedAt?: Date 
}

export type AdminUser = CoreUser & {
  role: UserRole.ADMIN;
}

export interface ValidationType {
  fields: string[];
  constraint: string; 
}

export interface ErrorResponse {
  name: string;
  message: string;
  validationErrors?: ValidationType[];
  stack?: string;
}