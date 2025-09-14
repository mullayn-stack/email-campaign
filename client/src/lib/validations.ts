import { z } from "zod";

export const campaignFormSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  postcode: z.string().optional(),
  note: z.string().max(500, "Personal note must be 500 characters or less").optional()
});

export const adminAuthFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

export const adminConfigFormSchema = z.object({
  title: z.string().min(1, "Campaign title is required"),
  tagline: z.string(),
  subject: z.string().min(1, "Email subject is required"),
  body: z.string().min(1, "Email body is required"),
  recipients: z.string().min(1, "At least one recipient is required")
});

export type CampaignFormData = z.infer<typeof campaignFormSchema>;
export type AdminAuthFormData = z.infer<typeof adminAuthFormSchema>;
export type AdminConfigFormData = z.infer<typeof adminConfigFormSchema>;
