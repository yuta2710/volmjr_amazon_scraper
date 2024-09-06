"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const product_service_1 = __importDefault(require("./product.service"));
const express_1 = require("express");
class AmazonBaseProductController {
    path = "/amazon_products";
    router = (0, express_1.Router)();
    service = new product_service_1.default();
    constructor() {
        this.initRoutes();
    }
    initRoutes = () => {
        this.router.route(`${this.path}`).post(this.createProduct);
        this.router.route(`${this.path}/:id`).get(this.getProductById);
    };
    getProductById = async (req, res, next) => {
        return this.service.getProductById(req, res, next);
    };
    createProduct = async (req, res, next) => {
        return this.service.createProduct(req, res, next);
    };
}
exports.default = AmazonBaseProductController;
//# sourceMappingURL=product.controller.js.map