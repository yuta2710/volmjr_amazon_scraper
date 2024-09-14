import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

import { StatusCodes } from "http-status-codes";
import { Token, verifyToken } from "../shared/actions/token";
import jwt from "jsonwebtoken";
import { AppError } from "../cores/errors";
import supabase from "../shared/supabase";

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
    const payload: Token | jwt.JsonWebTokenError = await verifyToken(token);

    if(payload instanceof jwt.JsonWebTokenError) {
      next(AppError.unauthorized("Authentication token is missing."));
    }

    console.log("Payload data");
    console.log(payload);

    const { data: { user }, error: fetchError } = await supabase.auth.getUser()
    
    if(fetchError || !user) {
      return next(AppError.unauthorized("User not found"));
    }
    
    // find user by id ==> get core user type 
    // console.log()
    // req.user = user;
    // const user = await supabas
  } catch (error) {
    throw AppError.badRequest("Bad request Loi oi")
  }
  
}
