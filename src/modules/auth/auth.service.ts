import {
  AuthenticationRequest,
  CoreUser,
  UserProfileInsert,
} from "../../shared/types";
import { NextFunction, Request, Response } from "express";
import { Session as AuthSession, SupabaseClient } from "@supabase/supabase-js";
import supabase from "../../shared/supabase";
import { AppError } from "../../cores/errors";
import colors from "colors";
import { clearCookies } from "../../shared/actions/token";

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

    await this.signOut();

    const { data: signedInData, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signedInData && signedInData.session) {
      console.log("\nSession Data");
      console.log(signedInData.session);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const authId = user.identities[0]["id"];

      // Check if user profile already exist
      const { data: existProfile, error: profileFetchError } = await this.db
        .from("user_profiles")
        .select("*")
        .eq("auth_id", authId)
        .single();

      if (profileFetchError && profileFetchError.code !== "PGRST116") {
        // Error occurred other than "no rows returned" (code PGRST116 means no data found)
        return next(AppError.internalServer("Failed to check user profile"));
      }

      if (!existProfile) {
        const sampleUserProfileDataForInsert: UserProfileInsert = {
          auth_id: authId,
          email: user.email,
        };

        // Create user profiles
        const { error: insertError } = await this.db
          .from("user_profiles")
          .insert(sampleUserProfileDataForInsert);

        if (insertError) {
          console.error(colors.red("Insert Error:"), insertError);
          return next(AppError.badRequest(insertError.details));
        }
      }

      await clearCookies(res);

      return res
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
      return next(AppError.badRequest("Invalid email or password"));
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    const user = req.user as CoreUser;
    res.status(200).json({
      success: true,
      data: user,
    });
  }

  async signOut(): Promise<void> {
    await this.db.auth.signOut();
  }
}

// const payload: Token | jwt.JsonWebTokenError = await verifyToken(token);

// if(payload instanceof jwt.JsonWebTokenError) {
//   next(AppError.unauthorized("Authentication token is missing."));
// }

// console.log("Payload data");
// console.log(payload);
