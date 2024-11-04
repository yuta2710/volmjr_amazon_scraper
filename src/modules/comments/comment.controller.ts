import { NextFunction, Request, Response, Router } from "express";
import BaseController from "../../shared/controller";
import AmazonCommentService from "./comment.service";
import { protect } from "../../middleware/AuthenticationMiddleware";

export default class AmazonCommentController implements BaseController {
  path: string = "/amazon_comments";
  router: Router = Router();
  private commentService: AmazonCommentService  = new AmazonCommentService();

  constructor() {
    this.initRoutes();
  }

  private initRoutes = (): void => {
    this.router.route(`${this.path}/:productId`).get(protect, this.getAllCommentsByProductId);
    this.router.route(`${this.path}/:productId/exports`).post(protect, this.exportedAllCommentsToExcelByProductId);
  }

  private getAllCommentsByProductId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {

    return this.commentService.getAllCommentsByProductId(req, res, next)
  }

  private exportedAllCommentsToExcelByProductId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    return this.commentService.exportedAllCommentsToExcelByProductId(req, res, next)
  }
}