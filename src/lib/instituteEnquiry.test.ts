import { expect, it } from "vitest";
import { instituteEnquirySchema } from "./instituteEnquiry";

const enquiry = { name: "Test visitor", phone: "9876543210", email: "visitor@example.org", message: "CAT preparation enquiry" };
it("requires an email before submitting an institute enquiry", () => {
  expect(instituteEnquirySchema.safeParse({ ...enquiry, email: " " }).success).toBe(false);
});
it("rejects malformed emails under the existing inquiry policy", () => {
  for (const email of ["visitor", "visitor@example", "visitor@exam1", "visitor<>@example.org"]) {
    expect(instituteEnquirySchema.safeParse({ ...enquiry, email }).success).toBe(false);
  }
});
it("enforces the existing 255-character email and name limits", () => {
  expect(instituteEnquirySchema.safeParse({ ...enquiry, email: `${"a".repeat(244)}@example.org` }).success).toBe(false);
  expect(instituteEnquirySchema.safeParse({ ...enquiry, name: "a".repeat(256) }).success).toBe(false);
});
it("continues requiring name and phone", () => {
  expect(instituteEnquirySchema.safeParse({ ...enquiry, name: " " }).success).toBe(false);
  expect(instituteEnquirySchema.safeParse({ ...enquiry, phone: " " }).success).toBe(false);
});
it("normalizes a valid enquiry without losing its message", () => {
  expect(instituteEnquirySchema.parse({ ...enquiry, email: " visitor@example.org " })).toEqual(enquiry);
});