import { NextFunction, Request, Response } from "express";
import CommentRepository from "./comment.repository";
import { BaseQueryResponse, CommentItem, ExportedCommentItemToExcel, ExportFileRequest } from "../../shared/types";
import { jsonCamelCase } from "../../shared/actions/to";
import { renderSuccessComponent } from "../../cores/success";
import { exportFileExcelToDesktop } from "../../shared/files";
import { getFormattedDateForFilename } from "../../shared/actions/date";

export default class AmazonCommentService {
  private commentRepository: CommentRepository = new CommentRepository();

  getAllCommentsByProductId = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    var pId = Number(req.params.productId);
    var {data: existingBulkCommentsFromDatabase, error}: BaseQueryResponse = await this.commentRepository.getAllCommentsByProductId(pId);

    var preprocessedData: CommentItem[] = [], results: CommentItem[] = []

    // Preprocessed the data 
    preprocessedData = jsonCamelCase(existingBulkCommentsFromDatabase) as CommentItem[]
    preprocessedData = preprocessedData.sort((a: CommentItem, b: CommentItem) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    results = preprocessedData

    return renderSuccessComponent(res, results)
  }

  exportedAllCommentsToExcelByProductId = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    var pId = Number(req.params.productId);
    var { fileName, fileType  } = req.body as ExportFileRequest
    var {data: existingBulkCommentsFromDatabase, error}: BaseQueryResponse = await this.commentRepository.getAllCommentsByProductId(pId);
    var formattedFile = `p${pId}_backup_${getFormattedDateForFilename()}.${fileType}`

    var preprocessedData: CommentItem[] = [], results: ExportedCommentItemToExcel[] = []

    // Preprocessed the data 
    preprocessedData = jsonCamelCase(existingBulkCommentsFromDatabase) as CommentItem[]
    preprocessedData = preprocessedData.sort((a: CommentItem, b: CommentItem) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    for(var i = 0; i < preprocessedData.length; i++) {
      let flattenedData: ExportedCommentItemToExcel = {
        title: preprocessedData[i]["title"],
        content: preprocessedData[i]["content"],
        product_id: preprocessedData[i]["productId"],
        helpful_count: preprocessedData[i]["helpfulCount"],
        rating: preprocessedData[i]["rating"],
        is_verified_purchase: preprocessedData[i]["isVerifiedPurchase"],
        location: preprocessedData[i]["location"],
        url: preprocessedData[i]["url"],
        sentiment_score: preprocessedData[i]["sentiment"]["score"],
        sentiment_emotion: preprocessedData[i]["sentiment"]["emotion"],
        total_records_in_current_page: preprocessedData[i]["pagination"]["totalRecords"],
        current_page: preprocessedData[i]["pagination"]["currentPage"],
        next_page_url: preprocessedData[i]["pagination"]["nextPage"]["url"],
        next_page_value: preprocessedData[i]["pagination"]["nextPage"]["metric"],
        prev_page_url: preprocessedData[i]["pagination"]["prevPage"]["url"],
        prev_page_value: preprocessedData[i]["pagination"]["prevPage"]["metric"],
        date: preprocessedData[i]["title"],
      }
      
      results.push(flattenedData)
    } 

    exportFileExcelToDesktop(results as object[], formattedFile)
    renderSuccessComponent(res, "Exported successfully")
  }
}