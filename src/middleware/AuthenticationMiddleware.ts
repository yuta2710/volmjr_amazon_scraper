import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from "express";
import { AppError } from "../cores/errors";
import {supabase} from "../shared/supabase";
import { CoreUser } from "@/shared/types";
import colors from "colors"

export async function protect(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;
  // Get token
  token = getTokenFromHeader(req) || getTokenFromCookies(req);

  if (!token) {
    const error = AppError.unauthorized("Unauthorized to access this route due to missing token");
    console.error("Formatted Stack Trace:", error.formattedStack);  // You can log the formatted stack trace
    return next(error);
  }

  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    const {data: userQueryResult, error: userQueryError } = 
      await supabase.from("user_profiles")
      .select()
      .eq("auth_id", decoded.sub)
      .single()
  
    if (userQueryError || !userQueryResult) {
      return next(AppError.unauthorized("User not found"));
    }

    req.user = userQueryResult as CoreUser;
    next();
  } catch (error) {
    return next(AppError.badRequest("Bad request Loi oi"));
  }
}

function getTokenFromHeader(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  
  if (authHeader !== undefined && authHeader.startsWith("Bearer ")) {
    return authHeader.split("Bearer ")[1].trim();
  }

  return undefined;
}

function getTokenFromCookies(req: Request): string | undefined {
  return req.cookies.accessToken;
}
