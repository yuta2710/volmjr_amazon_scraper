export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      base_products: {
        Row: {
          average_rating: number | null
          average_sentiment_analysis: Json
          best_seller_ranks: string[] | null
          brand: string | null
          business_target_for_collecting: string | null
          category: number | null
          delivery_location: string | null
          description: string | null
          histogram: Json
          id: number
          image: string | null
          is_out_of_stock: boolean | null
          number_of_comments: number | null
          price: Json
          retailer: string | null
          sales_volume_last_month: string | null
          title: string
          url: string
        }
        Insert: {
          average_rating?: number | null
          average_sentiment_analysis: Json
          best_seller_ranks?: string[] | null
          brand?: string | null
          business_target_for_collecting?: string | null
          category?: number | null
          delivery_location?: string | null
          description?: string | null
          histogram: Json
          id?: number
          image?: string | null
          is_out_of_stock?: boolean | null
          number_of_comments?: number | null
          price: Json
          retailer?: string | null
          sales_volume_last_month?: string | null
          title: string
          url: string
        }
        Update: {
          average_rating?: number | null
          average_sentiment_analysis?: Json
          best_seller_ranks?: string[] | null
          brand?: string | null
          business_target_for_collecting?: string | null
          category?: number | null
          delivery_location?: string | null
          description?: string | null
          histogram?: Json
          id?: number
          image?: string | null
          is_out_of_stock?: boolean | null
          number_of_comments?: number | null
          price?: Json
          retailer?: string | null
          sales_volume_last_month?: string | null
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "base_products_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["id"]
          },
        ]
      }
      category: {
        Row: {
          id: number
          lft: number
          name: string
          parent_id: number | null
          rgt: number
        }
        Insert: {
          id?: number
          lft: number
          name: string
          parent_id?: number | null
          rgt: number
        }
        Update: {
          id?: number
          lft?: number
          name?: string
          parent_id?: number | null
          rgt?: number
        }
        Relationships: [
          {
            foreignKeyName: "category_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          date: string
          helpful_count: number
          id: number
          location: string
          next_page: string
          product: Json
          rating: string
          sentiment: Json
          title: string
          url: string
          verified_purchase: boolean
        }
        Insert: {
          content: string
          date: string
          helpful_count: number
          id?: number
          location: string
          next_page: string
          product: Json
          rating: string
          sentiment: Json
          title: string
          url: string
          verified_purchase: boolean
        }
        Update: {
          content?: string
          date?: string
          helpful_count?: number
          id?: number
          location?: string
          next_page?: string
          product?: Json
          rating?: string
          sentiment?: Json
          title?: string
          url?: string
          verified_purchase?: boolean
        }
        Relationships: []
      }
      products: {
        Row: {
          asin: string
          availability: string | null
          best_seller_ranks: string | null
          category: string | null
          currency: string | null
          current_price: number | null
          discount_metric: string | null
          discount_price: number | null
          highest_price: number | null
          id: number
          is_amazon_choice: boolean | null
          link: string | null
          lowest_price: number | null
          original_price: number | null
          past: string | null
          rating_count: number | null
          retailer: string | null
          seller_id: number | null
          stars: number | null
          title: string
        }
        Insert: {
          asin: string
          availability?: string | null
          best_seller_ranks?: string | null
          category?: string | null
          currency?: string | null
          current_price?: number | null
          discount_metric?: string | null
          discount_price?: number | null
          highest_price?: number | null
          id?: number
          is_amazon_choice?: boolean | null
          link?: string | null
          lowest_price?: number | null
          original_price?: number | null
          past?: string | null
          rating_count?: number | null
          retailer?: string | null
          seller_id?: number | null
          stars?: number | null
          title: string
        }
        Update: {
          asin?: string
          availability?: string | null
          best_seller_ranks?: string | null
          category?: string | null
          currency?: string | null
          current_price?: number | null
          discount_metric?: string | null
          discount_price?: number | null
          highest_price?: number | null
          id?: number
          is_amazon_choice?: boolean | null
          link?: string | null
          lowest_price?: number | null
          original_price?: number | null
          past?: string | null
          rating_count?: number | null
          retailer?: string | null
          seller_id?: number | null
          stars?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          id: number
          name: string
          profile_url: string | null
          rating: number | null
          rating_count: number | null
        }
        Insert: {
          id?: number
          name: string
          profile_url?: string | null
          rating?: number | null
          rating_count?: number | null
        }
        Update: {
          id?: number
          name?: string
          profile_url?: string | null
          rating?: number | null
          rating_count?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      validate_percentage: {
        Args: {
          percentage: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
