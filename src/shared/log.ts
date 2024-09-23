import { CompetitorResponse } from "./types";
import colors from "colors";

export const viewCompetitorProductAnalysis = (index: number, response: CompetitorResponse): void => {
  console.log(colors.bgMagenta(`Product Analysis ${index}`));
  console.log(response);
}