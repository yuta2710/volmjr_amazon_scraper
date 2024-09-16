import { AppError } from "../../cores/errors";
import { NextFunction, Request } from "express";
import { AmazonScrapedResponse } from "../types";

// id must be primary key as postgresql 
export const isValidIdParams = (id: string, req: Request, next: NextFunction): number => {
  const result = parseInt(id, 10); // Convert userId to a number

  if (!isNaN(result)) {
    return result;
  }else {
    return undefined;
  }
};

export const isValidAmazonScrapedResponse = (data: any): data is AmazonScrapedResponse => {
  return typeof data === 'object' &&
         data !== null &&
         'product' in data &&      // check a key that's guaranteed to be in AmazonScrapedResponse
         'comments' in data && 
         'category' in data;   
}