import { isValidAmazonScrapedResponse } from '../shared/actions/checker';
import { Response } from "express"
import { isArray, isTypedArray } from "lodash"
import colors from "colors";
import AmazonCategoryRepository from '../modules/category/category.repository';

export const renderSuccessComponent = async(res: Response, data: any): Promise<void> => {
  if(isArray(data)) {
    res.status(200).json({
      success: true,
      count: data.length, 
      data,
    })
    return;
  }
  if(isValidAmazonScrapedResponse(data)) {
    const repo = new AmazonCategoryRepository();
    // console.log(colors.cyan("Yes, its really valid bro"))
    console.log(`Data product category ${data.product.category}`)
    console.log(await repo.getChildrenOfCurrentCategory(data.product.category));
    res.status(200).json({
      success: true,
      message: "Scraped data successfully",
      data: {
        product: data.product,
        comments: data.comments,
        category: await repo.getChildrenOfCurrentCategory(data.product.category),
        competitors: data.competitors
      },
    });
    return;
  } 
  else {
    res.status(200).json({
      success: true,
      data,
    })
    return;
  }
}

