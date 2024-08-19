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
      comments: {
        Row: {
          description: string | null
          helpful_count: number | null
          id: number
          location: string | null
          product_id: number | null
          rating: string | null
          title: string
          verified_purchase: boolean | null
        }
        Insert: {
          description?: string | null
          helpful_count?: number | null
          id?: number
          location?: string | null
          product_id?: number | null
          rating?: string | null
          title: string
          verified_purchase?: boolean | null
        }
        Update: {
          description?: string | null
          helpful_count?: number | null
          id?: number
          location?: string | null
          product_id?: number | null
          rating?: string | null
          title?: string
          verified_purchase?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
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
