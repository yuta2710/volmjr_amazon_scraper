import { CoreUser } from ".";

declare global {
  namespace Express {
    interface Request {
      user?: CoreUser
    }
  }
}