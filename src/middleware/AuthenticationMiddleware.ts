import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

import { StatusCodes } from "http-status-codes";
import { Token, verifyToken } from "../shared/actions/token";
import jwt from "jsonwebtoken";
import { AppError } from "../cores/errors";
import supabase from "../shared/supabase";
import { CoreUser } from "@/shared/types";

export async function protect(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;
  // Get token 
  token = getTokenFromHeader(req) || getTokenFromCookies(req);
  
  if(!token){
    return next(AppError.unauthorized("Authentication token is missing"));
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: queryResult, error: fetchError } = 
      await supabase
      .from("user_profiles")
      .select()
      .eq("auth_id", user.id)
      .single();

    
    if(fetchError || !queryResult) {
      return next(AppError.unauthorized("User not found"));
    }

    req.user = queryResult as CoreUser;
    next();
    // const user = await supabas
  } catch (error) {
    throw AppError.badRequest("Bad request Loi oi")
  }
  
}

function getTokenFromHeader(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if(authHeader || authHeader.split("Bearer ")) {
    return req.headers.authorization.split("Bearer ")[1].trim();
  }

  return undefined;
}

function getTokenFromCookies(req: Request): string | undefined {
  return req.cookies.accessToken;
}