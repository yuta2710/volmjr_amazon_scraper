import { AuthenticationRequest } from "./types/index";
import { z, ZodSchema } from "zod";

export interface ValidationHelper {
  validateEmail(email: string): boolean;
  validateAuth(data: unknown): { success: boolean; errors?: any };
}

export class AuthValidationHelper implements ValidationHelper {
  private emailSchema: ZodSchema<string> = z.string().email();
  private signUpSchema: ZodSchema<unknown> = z.object({
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters long"),
  });

  validateEmail(email: string): boolean {
    const validation = this.emailSchema.safeParse(email);
    return validation.success;
  }

  validateAuth(data: unknown): { success: boolean; errors?: any } {
    const result = this.signUpSchema.safeParse(data);

    if (result.success) {
      return { success: result.success };
    } else {
      return { success: false, errors: result.error.format() };
    }
  }
}
