import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

import { StatusCodes } from "http-status-codes";
import { Token, verifyToken } from "../shared/actions/token";
import jwt from "jsonwebtoken";
import { AppError } from "../cores/errors";
import supabase from "../shared/supabase";
import { CoreUser } from "@/shared/types";

export async function protect(req: Request, res: Response, next: NextFunction) {
  let token: string;
  // Get token 
  if(req.headers.authorization || req.headers.authorization.split("Bearer ")) {
    token = req.headers.authorization.split("Bearer ")[1].trim();
    console.log(`Token header authorization ${token}`);
  }else {
    token = req.cookies.accessToken
    console.log(`Token from cookie ${token}`);
  }

  if(!token){
    return next(AppError.unauthorized("Authentication token is missing"));
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();


    console.log("Fucking user in middleware");
    console.log(user);

    const { data: userGetter, error: fetchError } = 
      await supabase
      .from("user_profiles")
      .select()
      .eq("auth_id", user.id)
      .single();
    
    if(fetchError || !userGetter) {
      return next(AppError.unauthorized("User not found"));
    }
      

    // find user by id ==> get core user type 
    // console.log()
    req.user = userGetter as CoreUser;
    next();
    // const user = await supabas
  } catch (error) {
    throw AppError.badRequest("Bad request Loi oi")
  }
  
}
