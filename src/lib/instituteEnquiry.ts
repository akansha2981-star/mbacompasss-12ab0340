import { z } from "zod";

// Keep the email pattern aligned with the public inquiries INSERT policy.
export const instituteEnquirySchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(255, "Name must be 255 characters or fewer."),
  phone: z.string().trim().min(1, "Please enter your phone number.").max(30, "Phone must be 30 characters or fewer."),
  email: z.string().trim().min(1, "Please enter your email address.").max(255, "Email must be 255 characters or fewer.")
    .regex(/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/, "Please enter a valid email address."),
  message: z.string().trim().max(5000, "Message must be 5,000 characters or fewer."),
});