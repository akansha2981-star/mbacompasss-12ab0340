import type { ReactNode } from "react";

/** Editorial sections are unframed; only repeated records use cards. */
export default function CollegeContentSection({ children }: { children: ReactNode }) {
  return <section className="college-content-section">{children}</section>;
}