import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  CLASS_MODES,
  computeAverageRating,
  EXAM_CATEGORIES,
  RATING_PARAMETERS,
  reviewSubmissionSchema,
  type InstituteMatch,
  type RatingsMap,
} from "@/lib/coachingReviews";
import { matchCoachingInstituteFn, searchCoachingInstitutesFn, submitCoachingReviewFn } from "@/lib/coachingReviews.functions";

const defaultRatings = (): RatingsMap =>
  Object.fromEntries(RATING_PARAMETERS.map((p) => [p.key, 7])) as RatingsMap;

function ratingWord(value: number): string {
  if (value <= 2) return "Extremely Poor";
  if (value <= 4) return "Poor";
  if (value <= 5) return "Average";
  if (value <= 7) return "Good";
  if (value <= 8) return "Very Good";
  return "Excellent";
}

export default function RateCoachingPage() {
  const searchFn = useServerFn(searchCoachingInstitutesFn);
  const matchFn = useServerFn(matchCoachingInstituteFn);
  const submitFn = useServerFn(submitCoachingReviewFn);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<InstituteMatch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selected, setSelected] = useState<InstituteMatch | null>(null);
  const [newInstituteName, setNewInstituteName] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<InstituteMatch[]>([]);
  const [matching, setMatching] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [examCategory, setExamCategory] = useState<string>("");
  const [preparationYear, setPreparationYear] = useState("");
  const [classMode, setClassMode] = useState<string>("");
  const [ratings, setRatings] = useState<RatingsMap>(defaultRatings());
  const [reviewComment, setReviewComment] = useState("");
  const [confirmGenuine, setConfirmGenuine] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const average = useMemo(() => computeAverageRating(ratings), [ratings]);

  useEffect(() => {
    if (selected || newInstituteName) return;
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const rows = await searchFn({ data: { query: q } });
        setSuggestions(rows);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, selected, newInstituteName, searchFn]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pickInstitute = (match: InstituteMatch) => {
    setSelected(match);
    setNewInstituteName(null);
    setCandidates([]);
    setQuery(match.canonical_name);
    setShowSuggestions(false);
  };

  const chooseNewInstitute = async () => {
    const name = query.trim();
    if (name.length < 2) return;
    setMatching(true);
    setError(null);
    try {
      const result = await matchFn({ data: { query: name } });
      if (result.matchedInstituteId && result.confidence >= 85) {
        const hit = result.candidates.find((c) => c.id === result.matchedInstituteId);
        if (hit) {
          pickInstitute(hit);
          return;
        }
      }
      if (result.candidates.length > 0 && result.confidence >= 60) {
        // Medium confidence: ask the student to confirm instead of guessing.
        setCandidates(result.candidates);
        setShowSuggestions(false);
        return;
      }
      setCandidates([]);
      setSelected(null);
      setNewInstituteName(name);
      setShowSuggestions(false);
    } catch {
      setNewInstituteName(name);
      setShowSuggestions(false);
    } finally {
      setMatching(false);
    }
  };

  const clearInstitute = () => {
    setSelected(null);
    setNewInstituteName(null);
    setCandidates([]);
    setQuery("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const parsed = reviewSubmissionSchema.safeParse({
      studentName,
      studentEmail,
      instituteId: selected?.id ?? null,
      newInstituteName: newInstituteName ?? null,
      originalInstituteInput: query.trim() || null,
      examCategory: examCategory || null,
      preparationYear: preparationYear || null,
      classMode: classMode || null,
      ratings,
      reviewComment,
      confirmGenuine,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form and try again.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitFn({ data: parsed.data });
      setSuccess(result.message);
      setSelected(null);
      setNewInstituteName(null);
      setQuery("");
      setStudentName("");
      setStudentEmail("");
      setExamCategory("");
      setPreparationYear("");
      setClassMode("");
      setRatings(defaultRatings());
      setReviewComment("");
      setConfirmGenuine(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your review could not be submitted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-accent/40">
        <div className="container max-w-3xl py-10 text-center">
          <h1 className="text-3xl font-bold text-foreground">Rate Your Coaching Institute</h1>
          <p className="mt-3 text-base text-muted-foreground">
            Help fellow students make better decisions. Share your experience and rate your coaching institute.
          </p>
        </div>
      </section>

      <form onSubmit={submit} className="container max-w-3xl space-y-8 py-8">
        {success && (
          <div role="status" className="flex items-start gap-3 rounded-lg border border-primary/30 bg-accent p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-base text-foreground">{success}</p>
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
            <p className="text-base text-foreground">{error}</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Find your coaching institute</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div ref={searchBoxRef} className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (selected || newInstituteName) clearInstitute();
                }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search your coaching institute..."
                className="pl-9"
                aria-label="Search your coaching institute"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pickInstitute(s)}
                      className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-base hover:bg-accent"
                    >
                      <span className="text-foreground">{s.canonical_name}</span>
                      {s.matched_alias && <span className="text-sm text-muted-foreground">also known as {s.matched_alias}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selected && (
              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-accent px-4 py-2.5">
                <p className="text-base text-foreground">
                  Selected: <span className="font-semibold">{selected.canonical_name}</span>
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={clearInstitute}>
                  Change
                </Button>
              </div>
            )}
            {newInstituteName && (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-4 py-2.5">
                <p className="text-base text-foreground">
                  New institute: <span className="font-semibold">{newInstituteName}</span>
                  <span className="text-sm text-muted-foreground"> (our team will verify it)</span>
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={clearInstitute}>
                  Change
                </Button>
              </div>
            )}
            {candidates.length > 0 && !selected && (
              <div className="rounded-lg border border-border p-4">
                <p className="text-base font-medium text-foreground">Did you mean one of these?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {candidates.map((c) => (
                    <Button key={c.id} type="button" variant="outline" size="sm" onClick={() => pickInstitute(c)}>
                      {c.canonical_name}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNewInstituteName(query.trim());
                      setCandidates([]);
                    }}
                  >
                    None of these — add "{query.trim()}"
                  </Button>
                </div>
              </div>
            )}
            {!selected && !newInstituteName && query.trim().length >= 2 && (
              <Button type="button" variant="link" className="px-0" onClick={chooseNewInstitute} disabled={matching}>
                {matching ? "Checking..." : `Can't find it? Add "${query.trim()}" as a new institute`}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">About you</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="student-name">Your Name *</Label>
              <Input id="student-name" value={studentName} onChange={(e) => setStudentName(e.target.value)} maxLength={100} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="student-email">Your Email *</Label>
              <Input
                id="student-email"
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                maxLength={255}
                required
              />
              <p className="text-sm text-muted-foreground">Never shown publicly.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Exam Prepared For</Label>
              <Select value={examCategory} onValueChange={setExamCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_CATEGORIES.map((exam) => (
                    <SelectItem key={exam} value={exam}>
                      {exam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prep-year">Batch / Year of Preparation</Label>
              <Input
                id="prep-year"
                value={preparationYear}
                onChange={(e) => setPreparationYear(e.target.value)}
                placeholder="e.g. 2025"
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mode of Classes</Label>
              <Select value={classMode} onValueChange={setClassMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Rate each area</CardTitle>
            <p className="text-sm text-muted-foreground">1 = Extremely Poor, 5 = Average, 10 = Excellent</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {RATING_PARAMETERS.map((param) => (
              <div key={param.key} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <p className="text-base font-medium text-foreground">{param.label}</p>
                    <p className="text-sm text-muted-foreground">{param.description}</p>
                  </div>
                  <p className="shrink-0 text-base font-semibold text-foreground">
                    <span className="text-primary">{ratings[param.key]}</span>/10
                    <span className="ml-2 text-sm font-normal text-muted-foreground">{ratingWord(ratings[param.key])}</span>
                  </p>
                </div>
                <Slider
                  value={[ratings[param.key]]}
                  onValueChange={([v]) => setRatings((prev) => ({ ...prev, [param.key]: v }))}
                  min={1}
                  max={10}
                  step={1}
                  aria-label={param.label}
                />
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-accent px-4 py-3">
              <p className="text-base font-medium text-foreground">Your average rating</p>
              <p className="flex items-center gap-1.5 text-xl font-bold text-foreground">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                {average.toFixed(1)} / 10
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Your review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value.slice(0, 2000))}
              placeholder="Share your experience with this coaching institute. What did you like? What could be improved?"
              rows={6}
              aria-label="Your review"
            />
            <p className="text-right text-sm text-muted-foreground">{reviewComment.length} / 2,000 (minimum 30)</p>
            <label className="flex items-start gap-3">
              <Checkbox checked={confirmGenuine} onCheckedChange={(v) => setConfirmGenuine(v === true)} className="mt-1" />
              <span className="text-base text-foreground">I confirm that this review is based on my genuine experience.</span>
            </label>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Review"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Reviews are checked by our team before they appear publicly. Negative and positive feedback are treated equally.
        </p>
      </form>
    </main>
  );
}
