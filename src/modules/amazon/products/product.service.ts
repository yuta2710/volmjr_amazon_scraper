// import { supabase } from "../../../cores/db/supabase";
import { NextFunction, Request, Response } from "express";

import { createClient } from "@supabase/supabase-js";
import { Database } from "../../../shared/types/database.types";
import { AmazonScrapingProductRequest } from "./product.request";
import { scrapeAmazonProduct } from "../../../shared/actions/scraper";

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export default class BaseProductService {
  createProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<{message: "Created product on supabase successfully"} | Error> => {
    // return new Promise();
    const { url } = req.body as AmazonScrapingProductRequest
      
    scrapeAmazonProduct(url)
    return null 
  }

  getProductById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
      const {data, error} = await supabase
        .from("products")
        .select()
        .eq("id", Number(req.params.id));

      console.log("Thien");
      console.log(req.params.id);
      console.log(data);
    } catch (error) {
      console.log(error);
    }
  };
}
