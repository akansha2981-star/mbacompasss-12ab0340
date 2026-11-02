import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  row: z.record(z.string(), z.any()),
});

/** Saves a CAT score submission after confirming the mobile number was OTP-verified recently. Works for guests. */
export const saveCatScoreSubmission = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: otp } = await supabaseAdmin.from("phone_otps").select("id")
      .eq("phone", data.phone).eq("verified", true).gte("created_at", since).limit(1);
    if (!otp?.length) throw new Error("Please verify your mobile number with OTP first.");

    let userId: string | null = null;
    const auth = getRequestHeader("authorization");
    if (auth?.startsWith("Bearer ")) {
      const { data: u } = await supabaseAdmin.auth.getUser(auth.slice(7));
      userId = u?.user?.id ?? null;
    }

    const allowed = ["application_no","test_date","test_time","slot","response_sheet_url","subject","total_score","max_score",
      "estimated_percentile","total_questions","attempted","correct","incorrect","unattempted","accuracy","negative_marks",
      "varc_score","varc_attempted","varc_correct","varc_incorrect","varc_accuracy","dilr_score","dilr_attempted","dilr_correct",
      "dilr_incorrect","dilr_accuracy","qa_score","qa_attempted","qa_correct","qa_incorrect","qa_accuracy","sections_data","questions_data"];
    const row: Record<string, unknown> = {};
    for (const k of allowed) if (k in data.row) row[k] = data.row[k];

    const { data: ins, error } = await supabaseAdmin.from("cat_score_submissions").insert({
      ...row, candidate_name: data.name, email: data.email, phone: data.phone, phone_verified: true, user_id: userId,
    } as any).select("id, created_at").single();
    if (error) { console.error("cat save", error); throw new Error("Could not save your details. Please try again."); }
    return { id: ins.id as string, createdAt: ins.created_at as string };
  });
