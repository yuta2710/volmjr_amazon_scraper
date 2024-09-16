import { isValidAmazonScrapedResponse } from '../shared/actions/checker';
import { Response } from "express"
import { isArray, isTypedArray } from "lodash"
import colors from "colors";

export const renderSuccessComponent = (res: Response, data: any): void => {
  if(isArray(data)) {
    res.status(200).json({
      success: true,
      data,
      count: data.length 
    })
  }
  if(isValidAmazonScrapedResponse(data)) {
    // console.log(colors.cyan("Yes, its really valid bro"))
    res.status(200).json({
      success: true,
      message: "Scraped data successfully",
      scraper: {
        product: {
          data: data.product.asin,
        },
        comments: {
          data: {
            numberOfComments: data.comments.length,
          }
        },
        category: {
          data: data.category.name,
        }
      },
    });
  } 
  else {
    res.status(200).json({
      success: true,
      data,
    })
  }
}

