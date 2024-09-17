import { isValidAmazonScrapedResponse } from '../shared/actions/checker';
import { Response } from "express"
import { isArray, isTypedArray } from "lodash"
import colors from "colors";
import AmazonCategoryRepository from '../modules/category/category.repository';

export const renderSuccessComponent = async(res: Response, data: any): Promise<void> => {
  if(isArray(data)) {
    res.status(200).json({
      success: true,
      data,
      count: data.length 
    })
  }
  if(isValidAmazonScrapedResponse(data)) {
    const repo = new AmazonCategoryRepository();
    // console.log(colors.cyan("Yes, its really valid bro"))
    console.log(`Data product category ${data.product.category}`)
    console.log(await repo.getChildrenOfCurrentCategory(data.product.category));
    res.status(200).json({
      success: true,
      message: "Scraped data successfully",
      scraper: {
        product: {
          data: data.product.title,
        },
        comments: {
          data: {
            numberOfComments: data.comments.length,
          }
        },
        category: {
          data: data.product.category && await repo.getChildrenOfCurrentCategory(data.product.category),
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

