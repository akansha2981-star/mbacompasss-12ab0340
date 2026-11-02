// Server functions for the "Rate Your Coaching Institute" platform.
// Public functions use a publishable client (RLS: active institutes + approved reviews only).
// Submission uses the admin client inside the handler for duplicate/spam checks that must
// read other students' rows; the insert itself still satisfies the public INSERT policy shape.

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  computeAverageRating,
  csvCell,
  instituteSlug,
  normalizeInstituteName,
  RATING_PARAMETERS,
  reviewSubmissionSchema,
  stripHtml,
  toCsv,
  type InstituteMatch,
  type InstituteMatchResult,
  type ReviewStatus,
} from "@/lib/coachingReviews";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function assertAdmin(context: { supabase: any; userId: string }): Promise<void> {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Admins only");
}

// ---------------------------------------------------------------------------
// Public: institute search / autocomplete
// ---------------------------------------------------------------------------

export const searchCoachingInstitutesFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ query: z.string().trim().min(2).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: rows, error } = await supabase.rpc("search_coaching_institutes", {
      p_query: data.query,
      p_limit: 8,
    } as any);
    if (error) throw new Error(error.message);
    return ((rows ?? []) as unknown as InstituteMatch[]).sort((a, b) => b.score - a.score);
  });

// ---------------------------------------------------------------------------
// Public: AI-assisted institute matching
// ---------------------------------------------------------------------------

async function aiSemanticMatch(input: string, candidates: InstituteMatch[]): Promise<{ id: string; confidence: number } | null> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey || candidates.length === 0) return null;
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-4o",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You match a student's typed coaching institute name to the correct canonical institute from a candidate list. " +
            "Handle spelling variations, abbreviations and punctuation differences. " +
            "Never merge different institutes that merely sound similar (e.g. a city branch vs an online arm are different unless obviously the same brand). " +
            "Return only JSON: {\"matched_id\": string|null, \"confidence\": number 0-100}. Use null when none of the candidates is the same institute.",
        },
        {
          role: "user",
          content: JSON.stringify({
            student_input: input,
            candidates: candidates.map((c) => ({ id: c.id, name: c.canonical_name })),
          }),
        },
      ],
    }),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  try {
    const parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? "{}");
    if (!parsed.matched_id || typeof parsed.confidence !== "number") return null;
    return { id: String(parsed.matched_id), confidence: Math.max(0, Math.min(100, parsed.confidence)) };
  } catch {
    return null;
  }
}

export const matchCoachingInstituteFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ query: z.string().trim().min(2).max(120) }).parse(input))
  .handler(async ({ data }): Promise<InstituteMatchResult> => {
    const supabase = publicClient();
    const normalizedName = normalizeInstituteName(data.query);
    const { data: rows } = await supabase.rpc("search_coaching_institutes", { p_query: data.query, p_limit: 6 } as any);
    const candidates = ((rows ?? []) as unknown as InstituteMatch[]).sort((a, b) => b.score - a.score);
    const best = candidates[0];

    if (best && (best.matched_alias !== null || best.score >= 0.85)) {
      return {
        originalInput: data.query,
        normalizedName,
        matchedInstituteId: best.id,
        canonicalName: best.canonical_name,
        confidence: best.matched_alias !== null ? 100 : Math.round(best.score * 100),
        method: best.matched_alias !== null ? "exact_alias" : "fuzzy",
        candidates,
      };
    }

    const ai = await aiSemanticMatch(data.query, candidates);
    if (ai && ai.confidence >= 85) {
      const hit = candidates.find((c) => c.id === ai.id);
      if (hit) {
        return {
          originalInput: data.query,
          normalizedName,
          matchedInstituteId: hit.id,
          canonicalName: hit.canonical_name,
          confidence: ai.confidence,
          method: "ai_semantic",
          candidates,
        };
      }
    }

    return {
      originalInput: data.query,
      normalizedName,
      matchedInstituteId: null,
      canonicalName: null,
      confidence: ai?.confidence ?? (best ? Math.round(best.score * 100) : 0),
      method: candidates.length > 0 ? "fuzzy" : "none",
      candidates,
    };
  });

// ---------------------------------------------------------------------------
// Public: review submission (with duplicate / spam flagging)
// ---------------------------------------------------------------------------

export const submitCoachingReviewFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reviewSubmissionSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const comment = stripHtml(data.reviewComment);
    if (comment.length < 30) throw new Error("Please write at least 30 characters about your experience.");

    let instituteId = data.instituteId ?? null;
    let institutePending = false;

    if (!instituteId) {
      const name = data.newInstituteName!.trim();
      const normalized = normalizeInstituteName(name);
      // Re-check for an existing institute under a different spelling before creating one.
      const { data: existing } = await supabaseAdmin
        .from("coaching_review_institutes")
        .select("id, canonical_name, status")
        .eq("normalized_name", normalized)
        .is("parent_institute_id", null)
        .maybeSingle();
      if (existing) {
        if (existing.status === "active") {
          instituteId = existing.id;
        } else {
          instituteId = existing.id;
          institutePending = true;
        }
      } else {
        const baseSlug = instituteSlug(name);
        let slug = baseSlug;
        for (let i = 2; i < 20; i++) {
          const { data: clash } = await supabaseAdmin.from("coaching_review_institutes").select("id").eq("slug", slug).maybeSingle();
          if (!clash) break;
          slug = `${baseSlug}-${i}`;
        }
        const { data: created, error: createError } = await supabaseAdmin
          .from("coaching_review_institutes")
          .insert({ canonical_name: name, slug, normalized_name: normalized, status: "pending", source: "student" })
          .select("id")
          .single();
        if (createError || !created) throw new Error("We could not register that coaching institute. Please try again.");
        instituteId = created.id;
        institutePending = true;
      }
    } else {
      const { data: institute } = await supabaseAdmin
        .from("coaching_review_institutes")
        .select("id, status")
        .eq("id", instituteId)
        .maybeSingle();
      if (!institute) throw new Error("Please select a valid coaching institute.");
      institutePending = institute.status !== "active";
    }

    // Duplicate / spam checks (never auto-reject; only flag for admin review).
    const flagReasons: string[] = [];
    const email = data.studentEmail.toLowerCase();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const [{ data: sameInstitute }, { data: identicalComments }, { count: recentCount }] = await Promise.all([
      supabaseAdmin
        .from("coaching_student_reviews")
        .select("id")
        .eq("institute_id", instituteId)
        .ilike("student_email", email)
        .in("moderation_status", ["pending", "approved", "flagged"])
        .limit(1),
      supabaseAdmin.from("coaching_student_reviews").select("id").eq("review_comment", comment).limit(1),
      supabaseAdmin
        .from("coaching_student_reviews")
        .select("id", { count: "exact", head: true })
        .ilike("student_email", email)
        .gte("created_at", tenMinutesAgo),
    ]);

    if (sameInstitute && sameInstitute.length > 0) {
      throw new Error("You have already submitted a review for this coaching institute.");
    }
    if (identicalComments && identicalComments.length > 0) flagReasons.push("identical_comment");
    if ((recentCount ?? 0) >= 3) flagReasons.push("rapid_submissions");
    const values = RATING_PARAMETERS.map((p) => data.ratings[p.key]);
    if (new Set(values).size === 1) flagReasons.push("uniform_ratings");

    const average = computeAverageRating(data.ratings);
    const { error: insertError } = await supabaseAdmin.from("coaching_student_reviews").insert({
      student_name: data.studentName,
      student_email: email,
      institute_id: instituteId,
      original_institute_input: data.originalInstituteInput ?? data.newInstituteName ?? null,
      exam_category: data.examCategory ?? null,
      preparation_year: data.preparationYear || null,
      class_mode: data.classMode ?? null,
      ...data.ratings,
      average_rating: average,
      review_comment: comment,
      moderation_status: flagReasons.length > 0 ? "flagged" : "pending",
      flag_reasons: flagReasons.length > 0 ? flagReasons : null,
    });
    if (insertError) throw new Error("Your review could not be saved. Please try again.");

    return {
      ok: true,
      averageRating: average,
      institutePending,
      message: institutePending
        ? "Thank you! Your review is submitted. The institute name you added is new, so our team will verify it before your review goes live."
        : "Thank you! Your review is submitted and will appear once our team approves it.",
    };
  });

// ---------------------------------------------------------------------------
// Public: institute report page data
// ---------------------------------------------------------------------------

export const getCoachingReportFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().trim().min(1).max(120),
        sort: z.enum(["recent", "highest", "lowest"]).default("recent"),
        exam: z.string().trim().max(10).nullish(),
        page: z.number().int().min(1).max(500).default(1),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: institute, error } = await supabase
      .from("coaching_review_institutes")
      .select("id, canonical_name, slug, description, created_at")
      .eq("slug", data.slug)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!institute) return null;

    const pageSize = 10;
    const from = (data.page - 1) * pageSize;
    let query = supabase
      .from("coaching_public_reviews")
      .select("*", { count: "exact" })
      .eq("institute_id", institute.id);
    if (data.exam) query = query.eq("exam_category", data.exam);
    query =
      data.sort === "highest"
        ? query.order("average_rating", { ascending: false })
        : data.sort === "lowest"
          ? query.order("average_rating", { ascending: true })
          : query.order("created_at", { ascending: false });
    const [{ data: stats }, { data: reviews, count }] = await Promise.all([
      supabase.rpc("coaching_institute_stats", { p_institute_id: institute.id } as any),
      query.range(from, from + pageSize - 1),
    ]);

    return {
      institute,
      stats: stats as unknown as {
        total_reviews: number;
        overall_rating: number | null;
        last_review_at: string | null;
        parameters: Record<string, number | null>;
        distribution: Record<string, number>;
      },
      reviews: reviews ?? [],
      totalMatching: count ?? 0,
      page: data.page,
      pageSize,
    };
  });

// ---------------------------------------------------------------------------
// Admin: dashboard metrics
// ---------------------------------------------------------------------------

export const coachingReviewDashboardFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ from: z.string().nullish(), to: z.string().nullish() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const count = async (status?: ReviewStatus, since?: string) => {
      let q = supabaseAdmin.from("coaching_student_reviews").select("id", { count: "exact", head: true });
      if (status) q = q.eq("moderation_status", status);
      if (since) q = q.gte("created_at", since);
      if (data.from) q = q.gte("created_at", data.from);
      if (data.to) q = q.lte("created_at", data.to);
      return (await q).count ?? 0;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const [total, approved, pending, rejected, flagged, todayCount, monthCount, institutesRes, emailsRes, avgRes, topRes, dailyRes] =
      await Promise.all([
        count(),
        count("approved"),
        count("pending"),
        count("rejected"),
        count("flagged"),
        count(undefined, today.toISOString()),
        count(undefined, monthStart),
        supabaseAdmin.from("coaching_review_institutes").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("coaching_student_reviews").select("student_email"),
        supabaseAdmin.from("coaching_student_reviews").select("average_rating").eq("moderation_status", "approved"),
        supabaseAdmin
          .from("coaching_student_reviews")
          .select("institute_id, average_rating, coaching_review_institutes(canonical_name)")
          .eq("moderation_status", "approved"),
        supabaseAdmin.from("coaching_student_reviews").select("created_at").gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString()),
      ]);

    const uniqueStudents = new Set((emailsRes.data ?? []).map((r) => r.student_email.toLowerCase())).size;
    const approvedRatings = (avgRes.data ?? []).map((r) => Number(r.average_rating));
    const platformAvg = approvedRatings.length
      ? Math.round((approvedRatings.reduce((a, b) => a + b, 0) / approvedRatings.length) * 10) / 10
      : null;

    const byInstitute = new Map<string, { name: string; count: number; sum: number }>();
    for (const row of topRes.data ?? []) {
      const name = (row as any).coaching_review_institutes?.canonical_name ?? "Unknown";
      const entry = byInstitute.get(row.institute_id) ?? { name, count: 0, sum: 0 };
      entry.count += 1;
      entry.sum += Number(row.average_rating);
      byInstitute.set(row.institute_id, entry);
    }
    const instituteRows = [...byInstitute.values()];
    const mostReviewed = [...instituteRows].sort((a, b) => b.count - a.count).slice(0, 8);
    const highestRated = [...instituteRows]
      .filter((i) => i.count >= 1)
      .map((i) => ({ ...i, avg: Math.round((i.sum / i.count) * 10) / 10 }))
      .sort((a, b) => b.avg - a.avg);
    const lowestRated = [...highestRated].reverse();

    const byDay = new Map<string, number>();
    for (const row of dailyRes.data ?? []) {
      const day = row.created_at.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    const daily = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, n]) => ({ date, count: n }));

    const distribution = [0, 0, 0, 0, 0];
    for (const r of approvedRatings) {
      distribution[r <= 2 ? 0 : r <= 4 ? 1 : r <= 6 ? 2 : r <= 8 ? 3 : 4] += 1;
    }

    return {
      total,
      approved,
      pending,
      rejected,
      flagged,
      today: todayCount,
      thisMonth: monthCount,
      totalInstitutes: institutesRes.count ?? 0,
      uniqueStudents,
      platformAvg,
      mostReviewed,
      highestRated: highestRated.slice(0, 8),
      lowestRated: lowestRated.slice(0, 8),
      daily,
      distribution,
    };
  });

// ---------------------------------------------------------------------------
// Admin: review management
// ---------------------------------------------------------------------------

export const listCoachingReviewsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        status: z.enum(["pending", "approved", "rejected", "flagged"]).nullish(),
        instituteId: z.string().uuid().nullish(),
        search: z.string().trim().max(120).nullish(),
        minRating: z.number().min(1).max(10).nullish(),
        maxRating: z.number().min(1).max(10).nullish(),
        from: z.string().nullish(),
        to: z.string().nullish(),
        page: z.number().int().min(1).default(1),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pageSize = 25;
    let q = supabaseAdmin
      .from("coaching_student_reviews")
      .select("*, coaching_review_institutes(canonical_name, slug)", { count: "exact" })
      .order("created_at", { ascending: false });
    if (data.status) q = q.eq("moderation_status", data.status);
    if (data.instituteId) q = q.eq("institute_id", data.instituteId);
    if (data.search) q = q.or(`student_name.ilike.%${data.search}%,student_email.ilike.%${data.search}%`);
    if (data.minRating) q = q.gte("average_rating", data.minRating);
    if (data.maxRating) q = q.lte("average_rating", data.maxRating);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, count, error } = await q.range((data.page - 1) * pageSize, data.page * pageSize - 1);
    if (error) throw new Error(error.message);
    return { reviews: rows ?? [], total: count ?? 0, page: data.page, pageSize };
  });

export const moderateCoachingReviewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        reviewId: z.string().uuid(),
        action: z.enum(["approve", "reject", "flag", "delete"]),
        edits: z
          .object({ student_name: z.string().trim().min(2).max(100).optional(), review_comment: z.string().trim().min(30).max(2000).optional() })
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: review, error: readError } = await supabaseAdmin
      .from("coaching_student_reviews")
      .select("id, moderation_status")
      .eq("id", data.reviewId)
      .single();
    if (readError || !review) throw new Error("Review not found.");

    if (data.action === "delete") {
      const { error } = await supabaseAdmin.from("coaching_student_reviews").delete().eq("id", data.reviewId);
      if (error) throw new Error(error.message);
    } else {
      const newStatus: ReviewStatus = data.action === "approve" ? "approved" : data.action === "reject" ? "rejected" : "flagged";
      const update: Record<string, unknown> = { moderation_status: newStatus, updated_at: new Date().toISOString() };
      if (data.action === "approve") update.flag_reasons = null;
      if (data.edits?.student_name) update.student_name = data.edits.student_name;
      if (data.edits?.review_comment) update.review_comment = stripHtml(data.edits.review_comment);
      const { error } = await supabaseAdmin.from("coaching_student_reviews").update(update).eq("id", data.reviewId);
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin.from("coaching_review_audit_logs").insert({
      review_id: data.reviewId,
      admin_id: context.userId,
      action: data.action,
      previous_status: review.moderation_status,
      new_status: data.action === "delete" ? null : data.action === "approve" ? "approved" : data.action === "reject" ? "rejected" : "flagged",
    });
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Admin: institute management
// ---------------------------------------------------------------------------

export const listCoachingReviewInstitutesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ status: z.enum(["active", "pending", "hidden"]).nullish(), search: z.string().trim().max(120).nullish() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("coaching_review_institutes")
      .select("*, coaching_review_aliases(id, alias_name)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) q = q.ilike("canonical_name", `%${data.search}%`);
    const { data: institutes, error } = await q;
    if (error) throw new Error(error.message);

    const { data: agg } = await supabaseAdmin
      .from("coaching_student_reviews")
      .select("institute_id, average_rating")
      .eq("moderation_status", "approved");
    const stats = new Map<string, { count: number; sum: number }>();
    for (const row of agg ?? []) {
      const s = stats.get(row.institute_id) ?? { count: 0, sum: 0 };
      s.count += 1;
      s.sum += Number(row.average_rating);
      stats.set(row.institute_id, s);
    }
    return (institutes ?? []).map((i) => ({
      ...i,
      review_count: stats.get(i.id)?.count ?? 0,
      avg_rating: stats.get(i.id) ? Math.round((stats.get(i.id)!.sum / stats.get(i.id)!.count) * 10) / 10 : null,
    }));
  });

export const saveCoachingReviewInstituteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().nullish(),
        canonicalName: z.string().trim().min(2).max(120),
        description: z.string().trim().max(2000).nullish(),
        status: z.enum(["active", "pending", "hidden"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const normalized = normalizeInstituteName(data.canonicalName);
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("coaching_review_institutes")
        .update({
          canonical_name: data.canonicalName,
          normalized_name: normalized,
          description: data.description || null,
          status: data.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const baseSlug = instituteSlug(data.canonicalName);
    let slug = baseSlug;
    for (let i = 2; i < 20; i++) {
      const { data: clash } = await supabaseAdmin.from("coaching_review_institutes").select("id").eq("slug", slug).maybeSingle();
      if (!clash) break;
      slug = `${baseSlug}-${i}`;
    }
    const { data: created, error } = await supabaseAdmin
      .from("coaching_review_institutes")
      .insert({ canonical_name: data.canonicalName, slug, normalized_name: normalized, description: data.description || null, status: data.status, source: "admin" })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not save the institute.");
    return { id: created.id };
  });

export const addCoachingAliasFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ instituteId: z.string().uuid(), alias: z.string().trim().min(2).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const normalized = normalizeInstituteName(data.alias);
    const { error } = await supabaseAdmin
      .from("coaching_review_aliases")
      .upsert({ institute_id: data.instituteId, alias_name: data.alias, normalized_alias: normalized }, { onConflict: "normalized_alias" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const mergeCoachingInstitutesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ sourceId: z.string().uuid(), targetId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.sourceId === data.targetId) throw new Error("Choose two different institutes to merge.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: source } = await supabaseAdmin
      .from("coaching_review_institutes")
      .select("id, canonical_name, normalized_name")
      .eq("id", data.sourceId)
      .single();
    if (!source) throw new Error("Source institute not found.");

    const { error: moveReviews } = await supabaseAdmin
      .from("coaching_student_reviews")
      .update({ institute_id: data.targetId, updated_at: new Date().toISOString() })
      .eq("institute_id", data.sourceId);
    if (moveReviews) throw new Error(moveReviews.message);
    const { error: moveAliases } = await supabaseAdmin
      .from("coaching_review_aliases")
      .update({ institute_id: data.targetId })
      .eq("institute_id", data.sourceId);
    if (moveAliases) throw new Error(moveAliases.message);
    await supabaseAdmin
      .from("coaching_review_aliases")
      .upsert(
        { institute_id: data.targetId, alias_name: source.canonical_name, normalized_alias: source.normalized_name },
        { onConflict: "normalized_alias" },
      );
    const { error: hide } = await supabaseAdmin
      .from("coaching_review_institutes")
      .update({ status: "hidden", parent_institute_id: data.targetId, updated_at: new Date().toISOString() })
      .eq("id", data.sourceId);
    if (hide) throw new Error(hide.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Admin: CSV export
// ---------------------------------------------------------------------------

export const exportCoachingReviewsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        scope: z.enum(["all", "approved", "pending", "rejected", "flagged", "institutes", "ratings_summary"]),
        from: z.string().nullish(),
        to: z.string().nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.scope === "institutes") {
      const { data: rows, error } = await supabaseAdmin
        .from("coaching_review_institutes")
        .select("id, canonical_name, slug, status, source, created_at")
        .order("canonical_name");
      if (error) throw new Error(error.message);
      return {
        filename: "coaching_institutes.csv",
        csv: toCsv(
          ["Institute ID", "Canonical Name", "Slug", "Status", "Source", "Created At"],
          (rows ?? []).map((r) => [r.id, r.canonical_name, r.slug, r.status, r.source, r.created_at]),
        ),
      };
    }

    let q = supabaseAdmin
      .from("coaching_student_reviews")
      .select("*, coaching_review_institutes(canonical_name)")
      .order("created_at", { ascending: false })
      .limit(20000);
    if (data.scope !== "all" && data.scope !== "ratings_summary") q = q.eq("moderation_status", data.scope);
    if (data.scope === "ratings_summary") q = q.eq("moderation_status", "approved");
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const headers = [
      "Review ID", "Student Name", "Student Email", "Original Coaching Name", "Canonical Coaching Name", "Institute ID",
      ...RATING_PARAMETERS.map((p) => p.label),
      "Average Rating", "Review Comment", "Exam Category", "Preparation Year", "Submission Date", "Review Status",
    ];
    const body = (rows ?? []).map((r) => [
      r.id,
      r.student_name,
      r.student_email,
      r.original_institute_input ?? "",
      (r as any).coaching_review_institutes?.canonical_name ?? "",
      r.institute_id,
      ...RATING_PARAMETERS.map((p) => (r as any)[p.key]),
      r.average_rating,
      r.review_comment,
      r.exam_category ?? "",
      r.preparation_year ?? "",
      r.created_at,
      r.moderation_status,
    ]);
    return { filename: `coaching_reviews_${data.scope}.csv`, csv: toCsv(headers, body) };
  });
