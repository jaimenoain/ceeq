import { z } from "zod";

export const OnboardingSubmitSchema = z.object({
  workspaceType: z.enum(["SEARCHER", "INVESTOR"], {
    required_error: "Role selection is irreversible and required.",
  }),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  workspaceName: z.string().min(2, "Entity or Fund name must be valid"),
  linkedinUrl: z.string().url("Must be a valid URL").optional(),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
