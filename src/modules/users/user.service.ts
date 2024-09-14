// import supabase from "@/shared/supabase";
// import { AuthenticationRequest } from "@/shared/types";
// import { SupabaseClient } from "@supabase/supabase-js";
// import { NextFunction, Request, Response } from "express";
// import UserRepository from "./user.repository";

// export default class UserService {
//   // private db: SupabaseClient<any, "public", any> = supabase;
//   private uRepo: UserRepository = new UserRepository();

//   async createUser(
//     req: Request,
//     res: Response,
//     next: NextFunction): Promise<{ accessToken: string; refreshToken: string }> {
//     const { email, password } = req.body as AuthenticationRequest
//     console.log(email, password);
//   }

//   async getUserById(id: number) {

//   }

//   async updateUserById(id: number, sampleUpdate: any) {
    
//   }

//   async updateBulkUserByListOfId(ids: number[], sampleUpdate: any) {

//   }

//   async deleteUserById(id: number) {
    
//   }
// }