import { AuthenticationRequest } from "@/shared/types";
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

  async signIn(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const { email, password } = req.body as AuthenticationRequest;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("Sign In Data");
    console.log(data);

    const session: AuthSession = (await supabase.auth.getSession()).data
      .session;

    res.status(200).json({
      success: true,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
  }
}
