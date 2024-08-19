"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
require("dotenv/config");
const product_controller_1 = __importDefault(require("./modules/amazon/products/product.controller"));
const app = new app_1.default([
    new product_controller_1.default()
], Number(process.env.PORT));
console.log(process.env.HOST, process.env.PORT);
app.listen();
//# sourceMappingURL=server.js.map