import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type Token = {
  id: string;
  expiresIn: number; 
}

export const verifyToken = async (
  accessToken: string
): Promise<Token | jwt.JsonWebTokenError> => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      accessToken,
      process.env.JWT_ACCESS_SECRET as jwt.Secret,
      (err, payload) => {
        console.log("Is my payload");
        console.log(payload);
        if (err) reject(err);
        resolve(payload as Token);
      }
    );
  });
};

export const setTokenForCookies = async (
  req: Request,
    res: Response,
    next: NextFunction,
    duoTokens: {accessToken: string, refreshToken: string}
) => {
  if(duoTokens && "accessToken" in duoTokens) {
    res
      .status(200)
      .cookie("accessToken", duoTokens.accessToken, {
        expires: new Date(
          Date.now() + Number(process.env.JWT_COOKIE_EXPIRATION) * 24 * 60 * 1000
        ),
        httpOnly: true,
        sameSite: "none",
        secure: true 
      })
      .json(duoTokens);
  }else {
    console.error("Error set token")
  }
}

export const clearCookies = async (
  res: Response
): Promise<void> => {
  res.clearCookie("ACCESS_TOKEN");
}