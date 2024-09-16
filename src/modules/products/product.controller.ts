import { protect } from "../../middleware/AuthenticationMiddleware";
import BaseController from "../../shared/controller";
import BaseProductService from "./product.service";
import { NextFunction, Request, Response, Router } from "express";

export default class AmazonBaseProductController implements BaseController {
  path: string = "/amazon_products";
  router: Router = Router();
  private service: BaseProductService = new BaseProductService();

  constructor() {
    this.initRoutes();
  }

  private initRoutes = (): void => {
    this.router.route(`${this.path}`).post(protect, this.createProduct);
    this.router.route(`${this.path}/:id`).get(this.getProductById);
  };

  private getProductById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    return this.service.getProductById(req, res, next);
  };

  private createProduct = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    return this.service.createProduct(req, res, next);
  };
}
