"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeAmazonProduct = scrapeAmazonProduct;
const axios_https_proxy_fix_1 = __importDefault(require("axios-https-proxy-fix"));
const scraper_1 = require("../../../cores/scraper");
const cheerio = __importStar(require("cheerio"));
const USERNAME = String(process.env.BRIGHT_DATA_USERNAME);
const PASSWORD = String(process.env.BRIGHT_DATA_PASSWORD);
const AUTH = `${USERNAME}:${PASSWORD}`;
const SBR_WS_ENDPOINT = `wss://${AUTH}@brd.superproxy.io:9222`;
async function scrapeAmazonProduct(url) {
    if (!url)
        return;
    try {
        const response = await axios_https_proxy_fix_1.default.get(url, scraper_1.BrightDataConfigurations);
        // console.log("Data is")
        const $ = cheerio.load(response.data);
        const title = $("#productTitle").text().trim();
        const location = $("#glow-ingress-line2").text().trim();
        console.log({ title, location });
        // console.log(response.data)
    }
    catch (err) {
        console.log(err);
    }
}
//# sourceMappingURL=index.js.map