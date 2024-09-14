import App from "./app";
import "dotenv/config";
import AmazonBaseProductController from "./modules/products/product.controller";
import AuthController from "./modules/auth/auth.controller";
import { protect } from "./middleware/AuthenticationMiddleware";
import express, { Request, Response } from "express";

const app = new App([
  new AmazonBaseProductController(),
  new AuthController()
], Number(process.env.PORT))

console.log(process.env.HOST, process.env.PORT)
app.listen();