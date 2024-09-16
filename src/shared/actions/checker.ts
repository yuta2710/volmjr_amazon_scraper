import { AppError } from "../../cores/errors";
import { NextFunction, Request } from "express";

// id must be primary key as postgresql 
export const isValidIdParams = (id: string, req: Request, next: NextFunction): number => {
  const result = parseInt(id, 10); // Convert userId to a number

  if (!isNaN(result)) {
    return result;
  }else {
    return undefined;
  }
};
