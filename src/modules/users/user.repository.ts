import supabase from "@/shared/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

type UserDbSchema = {
  users: {
    id: string;
    email: string;
  }
} 

export default class UserRepository {
  private db: SupabaseClient<"users", any> = supabase;

  // async insertUserToDb(sampleInsert: any): Promise<{ accessToken: string; refreshToken: string }> {
  //   const { data, error } = await this.db
  //     .from("users")
  //     .insert(sampleInsert)
    
  //   return createToken(data)
  // }

  async getUserById(id: number) {

  }

  async updateUserById(id: number, sampleUpdate: any) {
    
  }

  async updateBulkUserByListOfId(ids: number[], sampleUpdate: any) {

  }

  async deleteUserById(id: number) {
    
  }
}