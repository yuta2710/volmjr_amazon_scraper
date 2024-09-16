import { CoreUser } from ".";

import * as qs from "qs";

declare global {
  namespace Express {
    export interface Request {
      params: {
        userId?: string;
      }; // Merge custom query with ParsedQs
      user?: CoreUser;
    }
  }
}