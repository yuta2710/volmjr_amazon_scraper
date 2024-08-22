import App from "./app";
import "dotenv/config";
import AmazonBaseProductController from "./modules/products/product.controller";

const app = new App([
  new AmazonBaseProductController()
], Number(process.env.PORT))

console.log(process.env.HOST, process.env.PORT)
app.listen();