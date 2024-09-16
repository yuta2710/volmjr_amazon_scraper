import BaseController from "@/shared/controller";
import AuthService from "./auth.service";
import { NextFunction, Request, Response, Router } from "express";
import { protect } from "../../middleware/AuthenticationMiddleware";

export default class AuthController implements BaseController {
  path: string = "/auth";
  router: Router = Router();

  private authService: AuthService = new AuthService();

  constructor(){
    this.initRoutes();
  }
   
  private initRoutes = (): void => {
    this.router.route(`${this.path}/signup`).post(this.signUp);
    this.router.route(`${this.path}/signin`).post(this.signIn);
    this.router.route(`${this.path}/me`).get(protect, this.getMe);
    this.router.route(`${this.path}/signout`).get(protect, this.signOut);
  }

  private signUp = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    return this.authService.signUp(req, res, next)
  }
  
  private signIn = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    return this.authService.signIn(req, res, next)
  }

  private getMe = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    return this.authService.getMe(req, res, next)
  }

  private signOut = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    return this.authService.signOut(req, res, next);
  }
}