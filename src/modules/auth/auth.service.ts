import { AuthenticationRequest, CoreUser } from "@/shared/types";
import { NextFunction, Request, Response } from "express";
import { Session as AuthSession, SupabaseClient } from "@supabase/supabase-js";
import supabase from "../../shared/supabase";

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
      console.log(user);

      const sampleUserProfileDataForInsert: CoreUser = {
        email: user.email,
      } 

      // Create user profiles 
      // const { data: insertedUserProfileData, error: insertError } = 
      //   await supabase
      //   .from("user_profiles")
      //   .insert()

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
