import { AuthenticationRequest, CoreUser, UserProfileInsert } from "@/shared/types";
import { NextFunction, Request, Response } from "express";
import { Session as AuthSession, SupabaseClient } from "@supabase/supabase-js";
import supabase from "../../shared/supabase";
import { AppError } from "../../cores/errors";

// Promise<{ accessToken: string; refreshToken: string }>
export default class AuthService {
  private db: SupabaseClient<any, "public", any> = supabase;

  async signUp(req: Request, res: Response, next: NextFunction): Promise<any> {
    const { email, password } = req.body as AuthenticationRequest;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.log(error);
    }

    console.log("Data after sign up");
    console.log(data);
  }

  async signIn(req: Request, res: Response, next: NextFunction) {
    const { email, password } = req.body as AuthenticationRequest;
    const { data: signedInData, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    console.log("Sign In Data");
    console.log(signedInData);

    if (signedInData && signedInData.session) {
      console.log("\nSession Data");
      console.log(signedInData.session);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("Retrieve user data");
      console.log(user.identities[0]["id"]);

      const sampleUserProfileDataForInsert: UserProfileInsert = {
        auth_id: user.identities[0]["id"],
        email: user.email,
      } 

      // Create user profiles 
      const { error: insertError } = 
        await supabase
        .from("user_profiles")
        .insert(sampleUserProfileDataForInsert)

      if(insertError){
        throw AppError.badRequest("Cannot insert data")
      }

      res
        .status(200)
        .cookie("ACCESS_TOKEN", signedInData.session.access_token, {
          expires: new Date(
            Date.now() + Number(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 1000,
          ),
          httpOnly: true,
          sameSite: "none",
          secure: true,
        })
        .json({
          success: true,
          accessToken: signedInData.session.access_token,
          refreshToken: signedInData.session.refresh_token,
        });
    } else {
      res.status(403).json({
        success: false,
        message: "Login failed",
      });
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    const user = req.user as CoreUser;
    res.status(200).json({
      success: true,
      data: user,
    });
  }
}




    // const payload: Token | jwt.JsonWebTokenError = await verifyToken(token);

    // if(payload instanceof jwt.JsonWebTokenError) {
    //   next(AppError.unauthorized("Authentication token is missing."));
    // }

    // console.log("Payload data");
    // console.log(payload);