import { useParams, Link } from "@/lib/router-compat";
import { formatMoney } from "@/lib/collegeMetrics";
import PageKeywords from "@/components/PageKeywords";
import { useEffect, useState, useRef, useCallback } from "react";
import { MapPin, Star, Users, TrendingUp, Award, BookOpen, Globe, GraduationCap, CheckCircle, Building, Calendar, ChevronDown, ChevronUp, Download, ThumbsUp, ThumbsDown, HelpCircle, Home, Image, Medal, Banknote, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useCollegeBySlug, useSuggestedColleges } from "@/hooks/useInstitutes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCtaGate } from "@/hooks/useCtaGate";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { collegeArticlesQuery } from "@/lib/queries/listingQueries";
import SEOHead, { generateCollegeSchema, generateFAQSchema } from "@/components/SEOHead";
import AnswerBlock from "@/components/AnswerBlock";
import {
  buildWebPageSchema,
  buildBreadcrumbSchema,
  buildDirectAnswerSchema,
  buildKeyFactsSchema,
  buildPageGraph,
  deriveDirectAnswer,
} from "@/lib/aeoSchema";
import { canonicalUrl } from "@/lib/canonical";
import { useResolvedSeo } from "@/hooks/useResolvedSeo";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import AIGistSection from "@/components/AIGistSection";
import NotFound from "@/pages/NotFound";
import InlineAIToolCTA from "@/components/InlineAIToolCTA";
import LastUpdatedBadge from "@/components/LastUpdatedBadge";
import CitationLink from "@/components/CitationLink";
import { enhanceAIContent } from "@/lib/aiContentEnhancer";
import { numericStat, rankOnly, stripTBA } from "@/lib/textClip";
import MobileActionBar from "@/components/mobile/MobileActionBar";
import FloatingTOC from "@/components/mobile/FloatingTOC";
import ProgrammePortfolioTable from "@/components/college/ProgrammePortfolioTable";
import { PlacementTrendChart, SectorDonut } from "@/components/college/PlacementCharts";
import { collegeTitle, collegeDescription } from "@/lib/collegeSeo";
import { normalizeCollegeSectionData } from "@/lib/collegeSectionData";
import { cdnImage } from "@/lib/imageTransform";
import { useProgrammeCourses } from "@/hooks/useProgrammeCourses";
import { Share2, Phone, Sparkles } from "lucide-react";
import AIExtensionBlock from "@/components/college/AIExtensionBlock";
import CollegeSectionNav from "@/components/college/CollegeSectionNav";
import CollegeAutoSlider from "@/components/college/CollegeAutoSlider";
import CollegeDataDossiers from "@/components/college/CollegeDataDossiers";
import CollegeContentSection from "@/components/college/CollegeContentSection";

// ── Fallback data used when no DB sections exist ──
const fallbackRatingAspects = [
  { label: "Academics", score: 4.5 }, { label: "Faculty", score: 4.2 }, { label: "Infrastructure", score: 4.0 },
  { label: "Accommodation", score: 3.8 }, { label: "Social Life", score: 4.3 }, { label: "Placements", score: 4.6 },
  { label: "Value for Money", score: 3.9 },
];
// Pulsing "live" dot used on application CTAs.
const LiveDot = () => (
  <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 pointer-events-none" />
    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
  </span>
);

// Slim animated application strip for the sidebar — another entry point to the official form.
const SidebarApplyStrip = ({ collegeName, applyUrl, applyLabel }: { collegeName: string; applyUrl: string; applyLabel: string }) => (
  <motion.a
    href={applyUrl}
    target="_blank"
    rel="noopener noreferrer sponsored"
    aria-label={`${applyLabel} — official application form for ${collegeName}`}
    className="block group"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.15 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="relative overflow-hidden rounded-xl border border-accent/70 bg-gradient-to-r from-accent via-accent/70 to-accent px-4 py-3.5 shadow-sm">
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-accent/40 rounded-full blur-2xl pointer-events-none" />
      <div className="relative z-10 flex items-center gap-3">
        <LiveDot />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-extrabold uppercase tracking-wider text-accent">Applications Open · 2027-29</div>
          <div className="font-bold text-foreground text-sm break-words">{applyLabel}</div>
        </div>
        <ChevronUp className="w-4 h-4 rotate-90 text-primary shrink-0 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
      </div>
    </div>
  </motion.a>
);

// Placement outcomes at a glance — shared between the desktop sidebar and the mobile stack.
const PlacementSnapshotCard = ({ college, topRecruiters, onViewPlacements, reportUrl }: { college: any; topRecruiters: string[]; onViewPlacements: () => void; reportUrl?: string }) => (
  <Card className="overflow-hidden border-border/60 hover:border-primary/30 transition-colors">
    <CardContent className="pt-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <h4 className="font-heading font-bold text-foreground">Placement Snapshot</h4>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {college.placement_avg && (
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-center">
            <div className="font-heading font-extrabold text-primary text-lg leading-tight">{numericStat(college.placement_avg)}</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">Average Package</div>
          </div>
        )}
        {college.placement_highest && (
          <div className="rounded-xl bg-accent/10 border border-accent/20 p-3 text-center">
            <div className="font-heading font-extrabold text-accent text-lg leading-tight">{numericStat(college.placement_highest)}</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">Highest Package</div>
          </div>
        )}
      </div>
      {topRecruiters.length > 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          Recruiters include <span className="font-semibold text-foreground">{topRecruiters.slice(0, 3).join(", ")}</span>{topRecruiters.length > 3 ? ` & ${topRecruiters.length - 3} more` : ""}.
        </p>
      )}
      <button
        type="button"
        onClick={onViewPlacements}
        className="mt-3 w-full text-center text-xs font-bold text-primary hover:text-primary/80 transition-colors"
      >
        View full placement report ↓
      </button>
      {reportUrl && (
        <a
          href={reportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-center gap-1.5 w-full rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Download Placement Report (PDF)
        </a>
      )}
    </CardContent>
  </Card>
);

// Key facts, accreditations and actions — shared between the desktop sidebar and the mobile stack.
const quickInfoIcon = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes("location") || l.includes("address")) return MapPin;
  if (l.includes("rank")) return Award;
  if (l.includes("established") || l.includes("cycle")) return Calendar;
  if (l.includes("student")) return Users;
  if (l.includes("fee") || l.includes("package") || l.includes("placement")) return Banknote;
  if (l.includes("exam")) return BookOpen;
  if (l.includes("contact") || l.includes("email") || l.includes("website")) return Globe;
  return Building;
};

const QuickInfoCard = ({ college, accreditations, applyUrl, applyLabel, quickItems }: { college: any; accreditations: string[]; applyUrl: string; applyLabel: string; quickItems?: { label: string; value: string }[] }) => (
  <Card className="overflow-hidden border-border/60 shadow-lg shadow-primary/5">
    <div className="h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />
    <CardContent className="pt-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-heading font-bold text-foreground">Quick Info</h3>
      </div>
      <div className="space-y-2.5">
        {(quickItems && quickItems.length > 0
          ? quickItems.map((it) => ({ icon: quickInfoIcon(it.label), label: it.label, value: it.value }))
          : [
          { icon: MapPin, label: "Location", value: `${college.city}, ${college.state}` },
          { icon: Award, label: "Ranking", value: Number(college.ranking) > 0 ? `#${college.ranking}` : "—" },
          { icon: BookOpen, label: "Type", value: college.type || "N/A" },
          { icon: Users, label: "Students", value: college.total_students ? `${college.total_students}+` : "N/A" },
          { icon: Building, label: "Campus", value: college.campus_size || "N/A" },
          { icon: Calendar, label: "Established", value: college.established ? String(college.established) : "N/A" },
        ]).map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0">
              <item.icon className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{item.label}</div>
              <div className="font-bold text-foreground text-sm break-words">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
      {accreditations.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/60">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Accreditations</div>
          <div className="flex flex-wrap gap-1.5">
            {accreditations.slice(0, 6).map((acc: string, i: number) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> {acc}
              </span>
            ))}
          </div>
        </div>
      )}
      {applyUrl && (
        <a href={applyUrl} target="_blank" rel="noopener noreferrer sponsored" aria-label={`${applyLabel} — official application form for ${college.name}`} className="block mt-4">
          <Button className="w-full gap-1.5 font-bold bg-accent text-accent hover:bg-accent shadow-md">
            <GraduationCap className="w-4 h-4" /> {applyLabel}
          </Button>
        </a>
      )}
      {college.website && (
        <a href={college.website} target="_blank" rel="noopener noreferrer" aria-label={`Visit the official website of ${college.name}`}>
          <Button variant="outline" className="w-full mt-2 gap-1.5 font-semibold border-primary/30 hover:bg-primary/5 hover:border-primary/50">
            <Globe className="w-4 h-4" /> Visit Official Site
          </Button>
        </a>
      )}
    </CardContent>
  </Card>
);

// Highlighted application CTA shown on colleges with an admin-managed external application link.
const ApplyBanner = ({ collegeName, applyUrl, applyLabel }: { collegeName: string; applyUrl: string; applyLabel: string }) => (
  <Card className="overflow-hidden border-0 shadow-xl shadow-primary/15 bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-primary-foreground relative">
    <div className="absolute -top-10 -right-10 w-36 h-36 bg-card/10 rounded-full blur-2xl pointer-events-none" />
    <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-card/5 rounded-full blur-2xl pointer-events-none" />
    <CardContent className="relative z-10 px-5 py-5 sm:px-6 sm:py-6 flex flex-col sm:flex-row items-center gap-4">
      <div className="flex-1 min-w-0 text-center sm:text-left">
        <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider bg-accent text-accent px-2 py-0.5 rounded-md shadow-md mb-2">
          Applications Open
        </span>
        <h3 className="font-heading font-extrabold text-lg sm:text-xl leading-tight">Apply to {collegeName}</h3>
        <p className="text-sm text-primary-foreground/80 mt-1">Fill the official application form on the {collegeName} admissions portal. It takes only a few minutes.</p>
      </div>
      <a href={applyUrl} target="_blank" rel="noopener noreferrer sponsored" className="shrink-0">
        <Button size="lg" className="bg-accent text-accent hover:bg-accent font-bold gap-2 shadow-2xl hover:scale-[1.03] transition-all px-6">
          <GraduationCap className="w-4 h-4" /> {applyLabel}
        </Button>
      </a>
    </CardContent>
  </Card>
);

const CollegeDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: college, isLoading } = useCollegeBySlug(slug);
  const { data: allColleges } = useSuggestedColleges(slug);
  const { user } = useAuth();
  const { toast } = useToast();
  const [curriculumTerm, setCurriculumTerm] = useState(0);
  const [scholarshipCat, setScholarshipCat] = useState("All");
  const [qaOpen, setQaOpen] = useState<number | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch verified MBA programme portfolio for this college
  const { data: programmes = [] } = useProgrammeCourses(college?.id);

  // Fetch college sections from DB (only active rows render publicly)
  const { data: dbSections } = useQuery({
    queryKey: ["college-sections", college?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("college_sections")
        .select("*")
        .eq("college_id", college?.id ?? "")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
    enabled: !!college?.id,
  });

  // Helpers — original content is preferred (preserves SEO authority).
  // AI versions are exposed separately so we can render them as ADDITIONAL extension blocks.
  const getOriginalSection = (type: string) =>
    dbSections?.find((s: any) => s.section_type === type && (s.version === "original" || !s.version));
  const getAISection = (type: string) =>
    dbSections?.find((s: any) => s.section_type === type && s.version && s.version !== "original");
  // For data fields (structured data like recruiters, courses) we prefer original; if missing fall back to AI.
  const getSection = (type: string) => getOriginalSection(type) || getAISection(type);
  const getSectionData = (type: string) => {
    const sec = getSection(type);
    return normalizeCollegeSectionData(sec?.data);
  };
  const getSectionContent = (type: string) => getSection(type)?.content || "";
  const getAIExtension = (type: string) => {
    const ai = getAISection(type);
    if (!ai) return null;
    // Only show as "extension" when an original also exists. Otherwise it's already the primary content.
    const hasOriginal = !!getOriginalSection(type);
    return hasOriginal ? ai : null;
  };

  const scrollToSection = useCallback((sectionId: string) => {
    if (!user) { setShowLoginDialog(true); return; }
    const el = sectionRefs.current[sectionId];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, [user]);

  // Fetch related articles
  const { data: relatedArticles } = useQuery(collegeArticlesQuery(college?.name));

  useEffect(() => {
    if (college) {
      document.title = collegeTitle(college as any);
    }
  }, [college]);

  const galleryData = getSectionData("gallery");
  const galleryImages = Array.isArray(galleryData.images)
    ? galleryData.images.map((i: any) => i.url).filter((url: any) => typeof url === "string" && url.trim()) : [];

  // Must call all hooks before any early returns to obey hooks rules
  const { gate: gateBrochure } = useCtaGate("college_download_brochure");
  const collegeJsonLd = college ? generateCollegeSchema(college) : undefined;
  const { seo: resolvedSeo } = useResolvedSeo(
    college ? "college" : undefined,
    college?.id,
    college
      ? {
          title: collegeTitle(college as any),
          description: collegeDescription(college),
          keywords: ((college as any).keywords || [college.name, college.city || "", "MBA"]).filter(Boolean),
          canonical: canonicalUrl(`/college/${college.slug}`),
          jsonLd: collegeJsonLd,
          ogImage: college.banner_url || college.logo_url || undefined,
        }
      : {},
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hero-gradient py-12"><div className="container mx-auto px-4"><Skeleton className="h-10 w-80 mb-3" /><Skeleton className="h-6 w-60" /></div></div>
        <div className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
          <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        </div>
      </div>
    );
  }

  if (!college) {
    return <NotFound />;
  }

  const exams = college.exams_accepted || [];
  const courses = college.courses || [];
  const accreditations = college.accreditations || [];
  const topRecruiters = college.top_recruiters || [];
  const highlights = college.highlights as any;
  const cutoffInfo = college.cutoff_info as any;
  const suggestedColleges = (allColleges || []).filter(c => c.slug !== college.slug).slice(0, 6);

  // Section data from DB or fallback
  const reviewData = getSectionData("reviews");
  const ratingAspects = reviewData.aspects?.length > 0 ? reviewData.aspects : fallbackRatingAspects;
  const overallRating = reviewData.overall_rating || (ratingAspects.reduce((s: number, a: any) => s + Number(a.score), 0) / ratingAspects.length).toFixed(1);

  const placementData = getSectionData("placements");
  const cutoffData = getSectionData("cutoff");
  const rankingsData = getSectionData("rankings");
  const scholarshipsData = getSectionData("scholarships");
  const facultyData = getSectionData("faculty");
  const hostelData = getSectionData("hostel");
  const qaData = getSectionData("qa");
  const admissionData = getSectionData("admission");
  const coursesFeesData = getSectionData("courses_fees");
  const whyJoinData = getSectionData("why_join");

  // External application link (admin-managed via the admission section's data.applyUrl).
  // When present, Apply buttons open the college's own application portal in a new tab.
  const applyUrl = typeof admissionData.applyUrl === "string" && /^https:\/\//.test(admissionData.applyUrl)
    ? admissionData.applyUrl
    : "";
  const applyLabel = typeof admissionData.applyLabel === "string" && admissionData.applyLabel.trim()
    ? admissionData.applyLabel.trim()
    : "Fill Application Form";

  // collegeJsonLd already computed above before early returns

  // Q&A items from DB or fallback
  const qaItems = qaData.questions?.length > 0 ? qaData.questions.map((q: any) => ({ q: q.question, a: q.answer })) : [
    { q: `What is the fee structure at ${college.name}?`, a: `The total program fees at ${college.name} is ${college.fees || "available on request"}.` },
    { q: `What exams are accepted?`, a: `${college.name} accepts ${exams.length > 0 ? exams.join(", ") : "CAT, XAT, GMAT"}.` },
    { q: `What is the average placement?`, a: `Average package: ${college.placement_avg || "competitive"}. Highest: ${college.placement_highest || "among the best"}.` },
  ];

  // AEO/GEO layer — answer-first summary, key facts, entity-linked page graph.
  const collegePath = `/college/${college.slug}`;
  const answerText = deriveDirectAnswer(
    (college as any).meta_description,
    (college as any).about || (college as any).description,
    `${college.name} is an MBA/PGDM business school${college.city ? ` in ${college.city}` : ""}${college.state ? `, ${college.state}` : ""}. Total programme fees are ${college.fees || "available on request"} and the average placement package is ${college.placement_avg || "available on request"}.`,
  );
  const answerFacts = [
    { label: "Location", value: [college.city, college.state].filter(Boolean).join(", ") || undefined },
    { label: "Total fees", value: formatMoney(college.fees) || undefined },
    { label: "Average package", value: formatMoney(college.placement_avg) || undefined },
    { label: "Highest package", value: formatMoney(college.placement_highest) || undefined },
    { label: "NIRF rank", value: college.ranking ? `#${college.ranking}` : undefined },
    { label: "Exams accepted", value: exams.length ? exams.slice(0, 4).join(", ") : undefined },
  ].filter((f) => f.value) as { label: string; value: string }[];

  const pageJsonLd = buildPageGraph(
    collegeJsonLd,
    buildWebPageSchema({
      path: collegePath,
      name: `${college.name} — Fees, Placements & Admission`,
      description: (college as any).meta_description || answerText,
      dateModified: (college as any).updated_at || undefined,
      primaryImage: college.banner_url || college.logo_url || undefined,
      breadcrumbs: [
        { name: "Colleges", url: "/colleges" },
        { name: college.name, url: collegePath },
      ],
    }),
    buildBreadcrumbSchema(collegePath, [
      { name: "Colleges", url: "/colleges" },
      { name: college.name, url: collegePath },
    ]),
    answerText
      ? buildDirectAnswerSchema({ path: collegePath, question: `What is ${college.name}?`, answer: answerText })
      : null,
    buildKeyFactsSchema({ path: collegePath, name: college.name, facts: answerFacts, description: (college as any).meta_description || answerText }),
    generateFAQSchema(qaItems),
  );


  const handleDownloadBrochure = gateBrochure(() => {
    const content = [`${college.name} - Brochure`, `Location: ${college.city}, ${college.state}`, `Ranking: #${college.ranking}`, `Fees: ${college.fees}`, `Avg Package: ${college.placement_avg}`].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${college.slug}-brochure.txt`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Brochure downloaded!" });
  }, "Sign in to download the college brochure.");

  // tabItems is built after section data is computed (see below) so tabs only
  // appear when their section actually renders.

  // ── Helpers to clean already-saved AI data that may contain raw HTML/citations ──
  const stripText = (v: any): string => {
    if (v == null) return "";
    return String(v)
      .replace(/\[src:[^\]]*\]/gi, "")
      .replace(/<p>\s*<em>\s*Last updated:[^<]*<\/em>\s*<\/p>/gi, "")
      .replace(/Last updated:\s*\d{4}-\d{2}-\d{2}/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ").trim();
  };
  const toPctNum = (v: any): number => {
    const m = stripText(v).match(/(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : 0;
  };

  // Placement sectors from DB or fallback
  const placementSectors = placementData.sectors?.length > 0
    ? placementData.sectors.map((s: any) => ({ sector: stripText(s.sector), pct: toPctNum(s.percentage) }))
    : [];

  const placementRecruiters = placementData.recruiters?.length > 0
    ? placementData.recruiters.map((r: any) => stripText(r.name)).filter(Boolean)
    : topRecruiters;

  // Official placement report extras (stats, salary bands, top offers, downloadable report)
  const placementStats = placementData.stats && typeof placementData.stats === "object" ? placementData.stats : null;
  const salaryBands = Array.isArray(placementData.salary_bands)
    ? placementData.salary_bands.map((b: any) => ({ band: stripText(b?.band), pct: toPctNum(b?.percentage) })).filter((b: any) => b.band && b.pct > 0)
    : [];
  const topOffers = Array.isArray(placementData.top_offers)
    ? placementData.top_offers.map((o: any) => ({ company: stripText(o?.company), ctc: stripText(o?.ctc) })).filter((o: any) => o.company && o.ctc)
    : [];
  const placementReportUrl = typeof placementData.reportUrl === "string" && /^\/__l5e\//.test(placementData.reportUrl)
    ? placementData.reportUrl
    : "";

  // Rankings from DB or fallback
  const rankingsList = rankingsData.rankings?.length > 0
    ? rankingsData.rankings.map((r: any) => ({ body: stripText(r.body), rank: stripText(r.rank), year: stripText(r.year) }))
    : [
        ...(Number(college.ranking) > 0 ? [{ body: "NIRF", rank: `#${college.ranking}`, year: "" }] : []),
      ];

  const rankAccreditations = rankingsData.accreditations?.length > 0
    ? rankingsData.accreditations.map((a: any) => stripText(a.name)).filter(Boolean)
    : accreditations;

  // International collaborations (partner universities with logos)
  const internationalData = getSectionData("international");
  const intlPartners = Array.isArray(internationalData.partners)
    ? internationalData.partners
        .map((p: any) => ({ name: stripText(p?.name), country: stripText(p?.country), logo: typeof p?.logo === "string" ? p.logo : "" }))
        .filter((p: any) => p.name)
    : [];

  // Quick info items (admin-managed; falls back to college fields)
  const quickInfoData = getSectionData("quick_info");
  const quickInfoItems = Array.isArray(quickInfoData.items)
    ? quickInfoData.items
        .map((i: any) => ({ label: stripText(i?.label), value: stripText(i?.value) }))
        .filter((i: any) => i.label && i.value)
    : [];

  // Term-wise curriculum (tabbed academic experience)
  const curriculumData = getSectionData("curriculum");
  const curriculumTerms = Array.isArray(curriculumData.terms)
    ? curriculumData.terms
        .map((t: any) => ({
          term: stripText(t?.term),
          total: stripText(t?.total),
          note: stripText(t?.note),
          subjects: Array.isArray(t?.subjects)
            ? t.subjects.map((s: any) => ({ code: stripText(s?.code), name: stripText(s?.name), credits: stripText(s?.credits) })).filter((s: any) => s.name)
            : [],
        }))
        .filter((t: any) => t.term && t.subjects.length > 0)
    : [];

  // Knowledge partners (industry/academic partners with logos)
  const knowledgePartnersData = getSectionData("knowledge_partners");
  const knowledgePartners = Array.isArray(knowledgePartnersData.partners)
    ? knowledgePartnersData.partners
        .map((p: any) => ({ name: stripText(p?.name), tagline: stripText(p?.tagline), logo: typeof p?.logo === "string" ? p.logo : "" }))
        .filter((p: any) => p.name)
    : [];

  // Tab nav / TOC — only include sections that actually render for this college
  const hasInternational = intlPartners.length > 0 || !!getSectionContent("international");
  const hasKnowledgePartners = knowledgePartners.length > 0 || !!getSectionContent("knowledge_partners");
  const tabItems = [
    { value: "overview", label: "Overview" }, { value: "courses", label: "Courses & Fees" },
    ...(curriculumTerms.length ? [{ value: "curriculum", label: "Curriculum" }] : []),
    { value: "admission", label: "Admissions" }, { value: "placements", label: "Placements" },
    ...(hasInternational ? [{ value: "international", label: "Global Exposure" }] : []),
    ...(hasKnowledgePartners ? [{ value: "knowledge_partners", label: "Knowledge Partners" }] : []),
    { value: "cutoff", label: "Cut-off" }, { value: "rankings", label: "Rankings" },
    { value: "reviews", label: "Reviews" }, { value: "gallery", label: "Gallery" },
    { value: "scholarships", label: "Scholarships" }, { value: "faculty", label: "Faculty" },
    { value: "hostel", label: "Hostel & Campus" }, { value: "qa", label: "Q&A" },
    { value: "news", label: "News" },
  ];

  // Award/ranking certificates uploaded by admin (image + caption)
  const rankCertificates = Array.isArray(rankingsData.certificates)
    ? rankingsData.certificates
        .map((c: any) => ({ image: typeof c?.image === "string" ? c.image : "", title: stripText(c?.title), issuer: stripText(c?.issuer), year: stripText(c?.year) }))
        .filter((c: any) => c.image)
    : [];

  // Scholarships from DB or fallback — category-aware for the filter-wise slider
  const scholarships = scholarshipsData.scholarships?.length > 0
    ? scholarshipsData.scholarships.map((s: any) => ({
        name: stripText(s.name),
        category: stripText(s.category),
        criteria: stripText(s.criteria),
        level: stripText(s.level),
        amount: stripText(s.amount),
        description: stripText(s.description),
      }))
    : [
        { name: "Merit Scholarship", category: "", criteria: "Top 10% CAT percentile", level: "", amount: "Up to 50% waiver", description: "For exceptional entrance exam scores." },
        { name: "Need-Based Aid", category: "", criteria: "Family income < ₹8 LPA", level: "", amount: "₹1-3 Lakh/year", description: "Financial assistance for deserving students." },
      ];
  const scholarshipCategories: string[] = Array.isArray(scholarshipsData.categories)
    ? scholarshipsData.categories.map((c: any) => stripText(c)).filter(Boolean)
    : [];
  const scholarshipNote = stripText(scholarshipsData.note);
  const scholarshipPolicy: string[] = Array.isArray(scholarshipsData.policy)
    ? scholarshipsData.policy.map((p: any) => stripText(p)).filter(Boolean)
    : [];
  const filteredScholarships = scholarshipCat === "All"
    ? scholarships
    : scholarships.filter((s: any) => s.category === scholarshipCat);
  // Parse the highest ₹ amount across scholarship entries. Handles "₹50,000",
  // "₹1.5 Lakh", "2 Crore", ranges like "₹50,000 - ₹1,00,000" (takes the max),
  // and ignores percentage waivers like "Up to 50% waiver".
  const parseScholarshipAmount = (raw: string): number => {
    const text = stripText(raw);
    if (!text || /%/.test(text)) return 0;
    let max = 0;
    const re = /([\d,]+(?:\.\d+)?)\s*(crore|cr|lakh|lac|l)?\b/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      let n = Number(m[1].replace(/,/g, ""));
      if (!Number.isFinite(n)) continue;
      const unit = (m[2] || "").toLowerCase();
      if (unit === "lakh" || unit === "lac" || unit === "l") n *= 100000;
      else if (unit === "crore" || unit === "cr") n *= 10000000;
      if (n > max) max = n;
    }
    return max;
  };
  const maxScholarship = (() => {
    let max = 0;
    for (const s of scholarships) {
      const n = parseScholarshipAmount(s.amount);
      if (n > max) max = n;
    }
    return max > 0 ? `₹${max.toLocaleString("en-IN")}` : "";
  })();

  // Faculty from DB or fallback
  const facultyList = facultyData.faculty?.length > 0
    ? facultyData.faculty
    : [
        { name: "Prof. Rajesh Kumar", department: "Finance", qualification: "PhD IIM Ahmedabad", experience: "20+ years" },
        { name: "Prof. Sunita Verma", department: "Marketing", qualification: "PhD ISB Hyderabad", experience: "15+ years" },
      ];

  // Hostel facilities from DB or fallback
  const hostelFacilities = hostelData.facilities?.length > 0
    ? hostelData.facilities.map((f: any) => f.name)
    : ["Wi-Fi Campus", "Swimming Pool", "Gymnasium", "Sports Complex", "Cafeteria", "Auditorium"];

  // Admission steps from DB or fallback
  const admissionSteps = admissionData.steps?.length > 0
    ? admissionData.steps
    : [
        { title: "Entrance Exam", description: `Score well in ${exams[0] || "CAT"} or other accepted exams` },
        { title: "Shortlisting", description: "Based on exam scores, academic profile, work experience" },
        { title: "GD/WAT/PI", description: "Group Discussion, Written Ability Test, Personal Interview" },
        { title: "Final Selection", description: "Merit list based on composite scores" },
      ];

  const eligibilityCriteria = admissionData.eligibility?.length > 0
    ? admissionData.eligibility.map((e: any) => e.text)
    : ["Bachelor's degree with minimum 50% marks", `Valid ${exams.join(" / ") || "CAT/XAT/GMAT"} score`, "Work experience preferred but not mandatory"];

  // Course fee data from DB or fallback
  const coursesFeesList = coursesFeesData.courses?.length > 0
    ? coursesFeesData.courses
    : courses.map((c: string) => ({ name: c, duration: "2 Years", eligibility: `Graduation + ${exams[0] || "CAT"}`, fees: college.fees || "Contact College" }));

  // Reviews from DB or fallback
  const reviewsList = reviewData.reviews?.length > 0
    ? reviewData.reviews
    : [
        { name: "Rahul S.", year: "Batch 2024", rating: 5, positives: "Excellent faculty, world-class infrastructure.", negatives: "High fees, competitive pressure." },
        { name: "Priya M.", year: "Batch 2023", rating: 4, positives: "Industry exposure through live projects.", negatives: "Hostel facilities could improve." },
      ];

  const whyJoinRatings = whyJoinData.ratings?.length > 0 ? whyJoinData.ratings : ratingAspects;

  return (
    <div className="college-detail min-h-screen bg-background">
      <SEOHead {...resolvedSeo} jsonLd={pageJsonLd as any} />
      <LoginRequiredDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} message="Sign in to access detailed college information." />

      <header className="college-profile-header relative overflow-hidden border-b border-border bg-secondary/40">
        {college.banner_url && <div className="pointer-events-none absolute inset-0">
          <img src={cdnImage(college.banner_url, { width: 1280 })} alt="" width={1280} height={500} className="college-cover w-full object-cover" fetchPriority="high" loading="eager" decoding="async" />
          <div className="college-cover-scrim pointer-events-none absolute inset-0" />
        </div>}
        <div className="container relative mx-auto px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <Link to="/colleges" className="text-sm font-medium text-primary">Colleges / {college.city || college.type}</Link>
            <Button variant="outline" size="icon" title="Share college" aria-label="Share college" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link copied!" }); }}><Share2 /></Button>
          </div>
          <div className="flex items-start gap-4 sm:gap-6">
            {college.logo_url ? <img src={cdnImage(college.logo_url, { width: 192 })} alt={`${college.name} logo`} width={96} height={96} className="college-profile-logo shrink-0 rounded-lg border border-border bg-card object-contain p-2" decoding="async" />
              : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-3xl font-bold text-primary">{college.name.charAt(0)}</div>}
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-2">{college.type && <Badge variant="secondary">{college.type}</Badge>}{college.tier && <Badge variant="outline">{college.tier}</Badge>}</div>
              <h1 className="font-heading text-3xl font-bold leading-tight text-foreground">{college.name}</h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0" />{[college.city, college.state].filter(Boolean).join(", ")}</span>
                {college.established && <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />Established {college.established}</span>}
              </div>
            </div>
          </div>
          <dl className="college-header-facts mt-7 grid grid-cols-2 gap-4 border-y border-border py-5 md:grid-cols-4">
            {[{ label: "Total Fees", value: formatMoney(college.fees), icon: Banknote }, { label: "Average Package", value: formatMoney(college.placement_avg), icon: TrendingUp }, { label: "Highest Package", value: formatMoney(college.placement_highest), icon: Award },
              Number(college.ranking) > 0 ? { label: "NIRF Rank", value: rankOnly(college.ranking), icon: Medal } : { label: "Accepted Exams", value: exams.join(" · "), icon: BookOpen }].map(fact => <div key={fact.label} className="min-w-0">
                <dt className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><fact.icon className="h-4 w-4 shrink-0 text-primary" />{fact.label}</dt>
                <dd className="font-heading text-xl font-bold text-foreground break-words">{fact.value || "Not disclosed"}</dd>
              </div>)}
          </dl>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={handleDownloadBrochure} className="gap-2"><Download />Download Brochure</Button>
            {applyUrl ? <Button asChild variant="outline"><a href={applyUrl} target="_blank" rel="noopener noreferrer sponsored"><GraduationCap />{applyLabel}</a></Button>
              : <Button variant="outline" onClick={() => scrollToSection("admission")}><GraduationCap />Admissions</Button>}
            <Button asChild variant="outline"><Link to="/compare"><TrendingUp />Compare</Link></Button>
            {college.website && <Button asChild variant="ghost"><a href={college.website} target="_blank" rel="noopener noreferrer"><Globe />Official Website</a></Button>}
          </div>
          {rankAccreditations.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{rankAccreditations.map((item: string) => <span key={item} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><CheckCircle className="h-4 w-4 text-primary" />{item}</span>)}</div>}
          <LastUpdatedBadge date={(college as any).last_seo_refresh || (college as any).updated_at} className="mt-4" />
        </div>
      </header>

      {/* Sticky Tab Nav — Premium pill style */}
      <div className="sticky top-16 z-40 bg-card/95 backdrop-blur-xl border-b border-border shadow-xs">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex overflow-x-auto gap-1.5 py-2.5 scrollbar-hide">
            {tabItems.map(t => (
              <Button variant="ghost"
                key={t.value}
                onClick={() => scrollToSection(t.value)}
                className="group relative shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all text-muted-foreground hover:text-primary hover:bg-primary/8 border border-transparent hover:border-primary/15"
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AIGistSection
          content={college.description || college.name}
          pageType="college"
          pageId={college.id}
          onScrollToContent={() => sectionRefs.current["overview"]?.scrollIntoView({ behavior: "smooth" })}
        />
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div data-ad-content className="space-y-6 min-w-0 overflow-hidden">

            {/* Answer-first block — powers the page's speakable + QA schema. */}
            {(answerText || answerFacts.length > 0) && (
              <AnswerBlock
                question={`What is ${college.name}?`}
                answer={answerText}
                facts={answerFacts}
                updatedAt={(college as any).updated_at || null}
              />
            )}

            {/* Mobile/tablet: key sidebar cards (the desktop sidebar is hidden below lg) */}
            <div className="lg:hidden space-y-4" aria-label={`${college.name} quick actions and summary`}>
              {applyUrl && <SidebarApplyStrip collegeName={college.name} applyUrl={applyUrl} applyLabel={applyLabel} />}
              {(college.placement_avg || college.placement_highest) && (
                <PlacementSnapshotCard
                  college={college}
                  topRecruiters={topRecruiters}
                  onViewPlacements={() => sectionRefs.current["placements"]?.scrollIntoView({ behavior: "smooth" })}
                  reportUrl={placementReportUrl}
                />
              )}
              <QuickInfoCard college={college} accreditations={accreditations} applyUrl={applyUrl} applyLabel={applyLabel} quickItems={quickInfoItems} />
            </div>



            {/* Overview */}
            <div id="overview" ref={el => { sectionRefs.current["overview"] = el; }} className="scroll-mt-32">
              <CollegeContentSection>
                <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-transparent" />
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    About {college.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {getSectionContent("why_join") ? (
                    <div className="text-muted-foreground leading-relaxed ai-content max-w-none" dangerouslySetInnerHTML={{ __html: enhanceAIContent(getSectionContent("why_join"), { entityName: college.name, entityWebsite: (college as any).website }) }} />
                  ) : (
                    <div className="text-muted-foreground leading-relaxed ai-content max-w-none" dangerouslySetInnerHTML={{ __html: enhanceAIContent(college.description || `${college.name} is a premier ${college.type} institute in ${college.city}.`, { entityName: college.name, entityWebsite: (college as any).website }) }} />
                  )}
                  {highlights && (
                    <div className="mt-6 pt-6 border-t border-dashed border-border">
                      <h3 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
                        <Star className="w-4 h-4 text-accent fill-accent" /> Key Highlights
                      </h3>
                      <CollegeAutoSlider items={Array.isArray(highlights) ? highlights : Object.entries(highlights).map(([key, value]) => `${key}: ${value}`)} label="Key highlights" render={(highlight: any) => (
                        <div className="flex h-full min-h-24 items-start gap-3 rounded-lg border border-border bg-card p-4"><CheckCircle className="mt-1 h-5 w-5 shrink-0 text-primary" /><span className="text-base text-foreground">{String(highlight)}</span></div>
                      )} />
                    </div>
                  )}
                </CardContent>
              </CollegeContentSection>

              {/* Why Join Ratings */}
              <CollegeContentSection>
                <div className="h-1 bg-gradient-to-r from-accent via-accent to-transparent" />
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center">
                      <Star className="w-5 h-5 text-accent fill-accent" />
                    </div>
                    Why Join {college.name}?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-6">
                    <div className="text-center shrink-0 p-4 rounded-2xl bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/40 dark:border-accent/30 self-center sm:self-auto min-w-[120px]">
                      <div className="text-4xl font-heading font-extrabold bg-gradient-to-br from-accent to-accent bg-clip-text text-transparent">{overallRating}</div>
                      <div className="flex items-center gap-0.5 justify-center mt-1">
                        {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(Number(overallRating)) ? "fill-accent text-accent" : "text-muted-foreground/40"}`} />)}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">Overall</div>
                    </div>
                    <div className="flex-1 w-full space-y-2.5 min-w-0">
                      {whyJoinRatings.map((a: any) => (
                        <div key={a.label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-foreground truncate pr-2">{a.label}</span>
                            <span className="text-xs font-extrabold text-foreground shrink-0">{a.score}/5</span>
                          </div>
                          <Progress value={Number(a.score) * 20} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </CollegeContentSection>

              {applyUrl && <ApplyBanner collegeName={college.name} applyUrl={applyUrl} applyLabel={applyLabel} />}
            </div>

            {/* Courses & Fees — verified MBA programme portfolio */}
            <div id="courses" ref={el => { sectionRefs.current["courses"] = el; }} className="scroll-mt-32">
              {programmes.length > 0 ? (
                <ProgrammePortfolioTable
                  programmes={programmes}
                  collegeSlug={college.slug}
                />
              ) : coursesFeesList.length > 0 ? (
                <CollegeContentSection>
                  <CardHeader><CardTitle className="font-heading">Courses & Fee Structure</CardTitle></CardHeader>
                  <CardContent>
                    <CollegeDataDossiers rows={coursesFeesList} label="Courses" columns={[
                      { label: "Course", value: (c: any) => c.name }, { label: "Duration", value: (c: any) => c.duration },
                      { label: "Eligibility", value: (c: any) => c.eligibility }, { label: "Fees", value: (c: any) => numericStat(c.fees) },
                    ]} />
                  </CardContent>
                </CollegeContentSection>
              ) : (
                <CollegeContentSection>
                  <CardHeader><CardTitle className="font-heading">Courses & Fee Structure</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-center py-8"><BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">Course details coming soon.</p></div>
                  </CardContent>
                </CollegeContentSection>
              )}
            </div>

            {/* Term-wise Curriculum */}
            {curriculumTerms.length > 0 && (
              <div id="curriculum" ref={el => { sectionRefs.current["curriculum"] = el; }} className="scroll-mt-32">
                <CollegeContentSection>
                  <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-transparent" />
                  <CardHeader>
                    <CardTitle className="font-heading flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      Our Academic Experience
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Six structured terms across two years — each progressively building deeper expertise in business management.</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-5" role="tablist" aria-label="Curriculum terms">
                      {curriculumTerms.map((t: any, i: number) => (
                        <button
                          key={i}
                          role="tab"
                          aria-selected={curriculumTerm === i}
                          onClick={() => setCurriculumTerm(i)}
                          className={`px-4 py-2 rounded-t-xl rounded-b-md text-sm font-bold transition-all ${curriculumTerm === i
                            ? "bg-accent text-accent shadow-md"
                            : "bg-primary/90 text-primary-foreground hover:bg-primary"}`}
                        >
                          {t.term}
                        </button>
                      ))}
                    </div>
                    {curriculumTerms[curriculumTerm] && (
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm border-collapse min-w-[420px]">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border whitespace-nowrap">{curriculumTerms[curriculumTerm].term}</th>
                              <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Subject</th>
                              <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Credits</th>
                            </tr>
                          </thead>
                          <tbody>
                            {curriculumTerms[curriculumTerm].subjects.map((s: any, i: number) => (
                              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                                <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{s.code}</td>
                                <td className="py-3 px-3 font-medium text-foreground">{s.name}</td>
                                <td className="py-3 px-3 text-right font-heading font-bold text-primary">{s.credits}</td>
                              </tr>
                            ))}
                            {curriculumTerms[curriculumTerm].total && (
                              <tr className="bg-primary/5">
                                <td className="py-3 px-3 font-heading font-bold text-foreground" colSpan={2}>Total Credits</td>
                                <td className="py-3 px-3 text-right font-heading font-extrabold text-primary">{curriculumTerms[curriculumTerm].total}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {curriculumTerms[curriculumTerm]?.note && (
                      <p className="text-xs text-muted-foreground mt-3">{curriculumTerms[curriculumTerm].note}</p>
                    )}
                  </CardContent>
                </CollegeContentSection>
              </div>
            )}

            {/* Admissions */}
            <div id="admission" ref={el => { sectionRefs.current["admission"] = el; }} className="scroll-mt-32">
              <CollegeContentSection>
                <CardHeader><CardTitle className="font-heading">Admission Process</CardTitle></CardHeader>
                <CardContent>
                  {getSectionContent("admission") ? (
                    <div className="text-muted-foreground leading-relaxed mb-6 ai-content max-w-none" dangerouslySetInnerHTML={{ __html: enhanceAIContent(getSectionContent("admission"), { entityName: college.name, entityWebsite: (college as any).website }) }} />
                  ) : (
                    <div className="text-muted-foreground leading-relaxed mb-6 ai-content max-w-none" dangerouslySetInnerHTML={{ __html: enhanceAIContent(college.admission_process || `Admission to ${college.name} is based on entrance exams followed by GD/PI.`, { entityName: college.name, entityWebsite: (college as any).website }) }} />
                  )}
                  <div className="space-y-4">
                    <h3 className="font-heading font-semibold text-foreground">Admission Steps</h3>
                    {admissionSteps.map((s: any, i: number) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">{i + 1}</div>
                        <div><h4 className="font-semibold text-foreground">{s.title}</h4><p className="text-sm text-muted-foreground">{s.description}</p></div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 rounded-lg bg-secondary/50 border border-border">
                    <h4 className="font-heading font-semibold text-foreground mb-2">Eligibility Criteria</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {eligibilityCriteria.map((c: string, i: number) => (
                        <li key={i} className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-primary" /> {c}</li>
                      ))}
                    </ul>
                  </div>
                  {applyUrl && (
                    <div className="mt-5 flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
                      <div className="flex-1 min-w-0 text-center sm:text-left">
                        <p className="font-heading font-bold text-foreground text-sm">Ready to apply to {college.name}?</p>
                        <p className="text-xs text-muted-foreground mt-0.5">You will be taken to the official {college.name} application portal.</p>
                      </div>
                      <a href={applyUrl} target="_blank" rel="noopener noreferrer sponsored" className="shrink-0">
                        <Button size="lg" className="font-bold gap-2 shadow-md">
                          <GraduationCap className="w-4 h-4" /> {applyLabel}
                        </Button>
                      </a>
                    </div>
                  )}
                  <AIExtensionBlock section={getAIExtension("admission")} extensionLabel="Detailed Admission Guide" entityName={college.name} entityWebsite={(college as any).website} />
                </CardContent>
              </CollegeContentSection>
            </div>

            {/* Placements */}
            <div id="placements" ref={el => { sectionRefs.current["placements"] = el; }} className="scroll-mt-32">
              <CollegeContentSection>
                <div className="h-1 bg-gradient-to-r from-primary via-primary to-transparent" />
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    Placement Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {[
                      { label: "Average Package", value: formatMoney(college.placement_avg) || "—", icon: TrendingUp, color: "from-primary/15 to-primary/5", iconColor: "text-primary" },
                      { label: "Highest Package", value: formatMoney(college.placement_highest) || "—", icon: Award, color: "from-accent/15 to-accent/5", iconColor: "text-accent" },
                      { label: "Median Package", value: formatMoney(college.placement_median) || "—", icon: Star, color: "from-primary/15 to-primary/5", iconColor: "text-primary" },
                      { label: "Placement Rate", value: numericStat(placementData.placement_rate), icon: CheckCircle, color: "from-primary/15 to-primary/5", iconColor: "text-primary" },
                    ].map(s => (
                      <div key={s.label} className={`relative bg-gradient-to-br ${s.color} rounded-xl p-4 text-center border border-border/40 hover:shadow-md hover:-translate-y-0.5 transition-all`}>
                        <s.icon className={`w-5 h-5 ${s.iconColor} mx-auto mb-2`} />
                        <div className="font-heading text-lg font-extrabold text-foreground leading-tight">{s.value}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {placementStats && (
                    <div className="mb-6">
                      <div className="flex flex-wrap items-center gap-2">
                        {[
                          placementStats.companies && { label: "Companies Visited", value: String(placementStats.companies) },
                          placementStats.offers && { label: "Offers Made", value: String(placementStats.offers) },
                          placementStats.distinct_recruiters && { label: "Distinct Recruiters", value: String(placementStats.distinct_recruiters) },
                          placementStats.internships && { label: "Internships Completed", value: String(placementStats.internships) },
                          placementStats.internship_conversion && { label: "Converted to Offers", value: String(placementStats.internship_conversion) },
                          placementStats.top10_mean && { label: "Top 10% Average", value: String(placementStats.top10_mean) },
                        ].filter(Boolean).map((s: any) => (
                          <div key={s.label} className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3.5 py-2">
                            <span className="font-heading font-extrabold text-foreground text-sm">{s.value}</span>
                            <span className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</span>
                          </div>
                        ))}
                      </div>
                      {placementReportUrl && (
                        <a
                          href={placementReportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md transition-all"
                        >
                          <Download className="w-4 h-4" /> Download Official Placement Report{placementData.batch ? ` — ${stripText(placementData.batch)}` : ""} (PDF)
                        </a>
                      )}
                    </div>
                  )}
                  {Array.isArray(placementData.yearly) && placementData.yearly.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-heading font-semibold text-foreground mb-3">Year-wise Placement Trends</h3>
                      <PlacementTrendChart yearly={placementData.yearly} />
                      <div className="mt-4"><CollegeDataDossiers rows={placementData.yearly} label="Placement years" columns={[
                        { label: "Year", value: (y: any) => stripText(y.year) }, { label: "Average CTC", value: (y: any) => stripText(y.average) },
                        { label: "Median CTC", value: (y: any) => stripText(y.median) }, { label: "Highest CTC", value: (y: any) => stripText(y.highest) },
                      ]} /></div>
                    </div>
                  )}
                  <h3 className="font-heading font-semibold text-foreground mb-3">Sector-wise Placements</h3>
                  <div className="mb-6">
                    <SectorDonut sectors={placementSectors} />
                  </div>
                  {salaryBands.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-heading font-semibold text-foreground mb-3">Salary Break-up Bands</h3>
                      <div className="space-y-3">
                        {salaryBands.map((b: any) => (
                          <div key={b.band}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-foreground">{b.band}</span>
                              <span className="font-heading font-bold text-primary text-sm">{b.pct}%</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary" style={{ width: `${b.pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {topOffers.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-heading font-semibold text-foreground mb-1">Top Offers by CTC</h3>
                      {placementStats?.top10_mean && (
                        <p className="text-xs text-muted-foreground mb-3">Top 10% of offers: mean {stripText(placementStats.top10_mean)}{placementStats.top10_median ? `, median ${stripText(placementStats.top10_median)}` : ""}.</p>
                      )}
                      <CollegeDataDossiers rows={topOffers} label="Top offers" columns={[
                        { label: "Company", value: (o: any) => o.company }, { label: "CTC", value: (o: any) => o.ctc },
                      ]} />
                    </div>
                  )}
                  {placementRecruiters.length > 0 && (
                    <div>
                      <h3 className="font-heading font-semibold text-foreground mb-3">Top Recruiters</h3>
                      <CollegeAutoSlider items={placementRecruiters} label="Recruiters" render={(r: string) => (
                        <div className="flex min-h-24 items-center gap-3 rounded-lg border border-border bg-card p-5"><Building className="h-6 w-6 shrink-0 text-primary" /><span className="font-heading text-base font-semibold text-foreground">{r}</span></div>
                      )} />
                    </div>
                  )}
                  {getSectionContent("placements") && (
                    <div className="mt-4 ai-content max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: enhanceAIContent(getSectionContent("placements"), { entityName: college.name, entityWebsite: (college as any).website }) }} />
                  )}
                  <AIExtensionBlock section={getAIExtension("placements")} extensionLabel="Placement Insights & Trends" entityName={college.name} entityWebsite={(college as any).website} />
                </CardContent>
              </CollegeContentSection>
              {applyUrl && <div className="mt-6"><ApplyBanner collegeName={college.name} applyUrl={applyUrl} applyLabel={applyLabel} /></div>}
            </div>

            <InlineAIToolCTA variant="college-shortlister" />

            {/* International Collaborations */}
            {(intlPartners.length > 0 || getSectionContent("international")) && (
              <div id="international" ref={el => { sectionRefs.current["international"] = el; }} className="scroll-mt-32">
                <CollegeContentSection>
                  <div className="h-1 bg-gradient-to-r from-primary via-primary to-transparent" />
                  <CardHeader>
                    <CardTitle className="font-heading flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-primary" />
                      </div>
                      International Collaborations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getSectionContent("international") && (
                      <div className="text-muted-foreground leading-relaxed mb-6 ai-content max-w-none" dangerouslySetInnerHTML={{ __html: enhanceAIContent(getSectionContent("international"), { entityName: college.name, entityWebsite: (college as any).website }) }} />
                    )}
                    {intlPartners.length > 0 && (
                      <CollegeAutoSlider
                        items={intlPartners}
                        label="International collaborations"
                        render={(p: any) => (
                          <div className="h-full rounded-lg border border-border/60 bg-gradient-to-b from-card to-primary/5 p-5 flex flex-col items-center text-center gap-3 hover:shadow-lg hover:-translate-y-1 hover:border-primary/40 transition-all duration-300">
                            {p.logo ? (
                              <div className="h-16 w-full flex items-center justify-center rounded-xl bg-background/80 border border-border/40 px-3 py-2">
                                <img src={p.logo} alt={`${p.name} logo`} width={200} height={80} className="max-h-16 w-full object-contain" loading="lazy" decoding="async" />
                              </div>
                            ) : (
                              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary flex items-center justify-center text-primary-foreground font-extrabold text-lg shadow-lg shadow-primary/30">{p.name.charAt(0)}</div>
                            )}
                            <div>
                              <div className="text-xs font-bold text-foreground leading-snug">{p.name}</div>
                              {p.country && <div className="text-sm text-muted-foreground mt-0.5">{p.country}</div>}
                            </div>
                          </div>
                        )}
                      />
                    )}
                  </CardContent>
                </CollegeContentSection>
              </div>
            )}

            {/* Knowledge Partners */}
            {(knowledgePartners.length > 0 || getSectionContent("knowledge_partners")) && (
              <div id="knowledge_partners" ref={el => { sectionRefs.current["knowledge_partners"] = el; }} className="scroll-mt-32">
                <CollegeContentSection>
                  <div className="h-1 bg-gradient-to-r from-primary via-primary to-transparent" />
                  <CardHeader>
                    <CardTitle className="font-heading flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      Knowledge Partners
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getSectionContent("knowledge_partners") && (
                      <div className="text-muted-foreground leading-relaxed mb-6 ai-content max-w-none" dangerouslySetInnerHTML={{ __html: enhanceAIContent(getSectionContent("knowledge_partners"), { entityName: college.name, entityWebsite: (college as any).website }) }} />
                    )}
                    {knowledgePartners.length > 0 && (
                      <CollegeAutoSlider
                        items={knowledgePartners}
                        label="Knowledge partners"
                        render={(p: any) => (
                          <div className="h-full rounded-lg border border-border/60 bg-gradient-to-b from-card to-primary/5 p-5 flex flex-col items-center text-center gap-3 hover:shadow-lg hover:-translate-y-1 hover:border-primary/40 transition-all duration-300">
                            {p.logo ? (
                              <div className="h-16 w-full flex items-center justify-center rounded-xl bg-background/80 border border-border/40 px-3 py-2">
                                <img src={p.logo} alt={`${p.name} logo`} width={200} height={80} className="max-h-16 w-full object-contain" loading="lazy" decoding="async" />
                              </div>
                            ) : (
                              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary flex items-center justify-center text-primary-foreground font-extrabold text-lg shadow-lg shadow-primary/30">{p.name.charAt(0)}</div>
                            )}
                            <div>
                              <div className="text-xs font-bold text-foreground leading-snug">{p.name}</div>
                              {p.tagline && <div className="text-sm text-muted-foreground mt-0.5">{p.tagline}</div>}
                            </div>
                          </div>
                        )}
                      />
                    )}
                  </CardContent>
                </CollegeContentSection>
              </div>
            )}

            {/* Cutoff */}
            <div id="cutoff" ref={el => { sectionRefs.current["cutoff"] = el; }} className="scroll-mt-32">
              <CollegeContentSection>
                <CardHeader><CardTitle className="font-heading">Cutoff Details</CardTitle></CardHeader>
                <CardContent>
                  {Array.isArray(cutoffData.cutoffs) && cutoffData.cutoffs.length > 0 ? (
                    <CollegeDataDossiers rows={cutoffData.cutoffs} label="Cutoffs" columns={[
                      { label: "Category", value: (c: any) => c.category }, { label: "Exam", value: (c: any) => c.exam },
                      { label: "Year", value: (c: any) => c.year }, { label: "Percentile", value: (c: any) => numericStat(c.percentile, stripTBA(c.percentile) || "—") },
                    ]} />
                  ) : cutoffInfo ? (
                    <CollegeDataDossiers rows={Object.entries(cutoffInfo)} label="Cutoffs" columns={[
                      { label: "Category", value: (c: any) => c[0] }, { label: "Cutoff", value: (c: any) => String(c[1]) },
                    ]} />
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Cutoff data coming soon.</p>
                  )}
                  {getSectionContent("cutoff") && (
                    <div className="mt-4 ai-content max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: enhanceAIContent(getSectionContent("cutoff"), { entityName: college.name, entityWebsite: (college as any).website }) }} />
                  )}
                  <AIExtensionBlock section={getAIExtension("cutoff")} extensionLabel="Cut-off Trends & Analysis" entityName={college.name} entityWebsite={(college as any).website} />
                </CardContent>
              </CollegeContentSection>
            </div>

            {/* Rankings */}
            <div id="rankings" ref={el => { sectionRefs.current["rankings"] = el; }} className="scroll-mt-32">
              <CollegeContentSection>
                <div className="h-1 bg-gradient-to-r from-accent via-accent to-transparent" />
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center">
                      <Medal className="w-5 h-5 text-accent" />
                    </div>
                    Rankings & Accreditations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3 mb-6">
                    {rankingsList.map((r: any, i: number) => (
                      <div key={i} className="relative bg-gradient-to-br from-accent/40 to-transparent dark:from-accent/10 rounded-xl p-4 flex items-center gap-4 border border-accent/40 dark:border-accent/30 hover:shadow-md hover:-translate-y-0.5 transition-all">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-accent flex items-center justify-center text-foreground font-extrabold text-base shrink-0 shadow-lg shadow-accent/30">
                          {r.rank}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground text-sm">{r.body}</div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">{r.year} Ranking</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {rankAccreditations.length > 0 && (
                    <div className="pt-4 border-t border-dashed border-border">
                      <h3 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" /> Accreditations
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {rankAccreditations.map((a: string) => (
                          <div key={a} className="flex items-center gap-1.5 bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/50 dark:border-primary/30 rounded-lg px-3 py-1.5">
                            <Award className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-bold text-foreground">{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {rankCertificates.length > 0 && (
                    <div className="pt-4 border-t border-dashed border-border mt-4">
                      <h3 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2">
                        <Medal className="w-4 h-4 text-accent" /> Certificates & Awards
                      </h3>
                      <CollegeAutoSlider
                        items={rankCertificates}
                        label="Certificates and awards"
                        render={(c: any, i: number) => (
                          <figure className="group h-full rounded-lg overflow-hidden border border-border/60 bg-card shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-accent/40 transition-all duration-300">
                            <div className="overflow-hidden">
                              <img src={c.image} alt={c.title || `Award certificate ${i + 1}`} width={640} height={480} className="w-full aspect-[4/3] object-contain group-hover:scale-[1.04] transition-transform duration-500" loading="lazy" decoding="async" />
                            </div>
                            {(c.title || c.issuer) && (
                              <figcaption className="p-2.5">
                                {c.title && <div className="text-xs font-bold text-foreground leading-snug">{c.title}</div>}
                                {(c.issuer || c.year) && <div className="text-sm text-muted-foreground mt-0.5">{[c.issuer, c.year].filter(Boolean).join(" · ")}</div>}
                              </figcaption>
                            )}
                          </figure>
                        )}
                      />
                    </div>
                  )}
                  <AIExtensionBlock section={getAIExtension("rankings")} extensionLabel="Rankings Context & Recognition" entityName={college.name} entityWebsite={(college as any).website} />
                </CardContent>
              </CollegeContentSection>
            </div>

            {/* Reviews */}
            <div id="reviews" ref={el => { sectionRefs.current["reviews"] = el; }} className="scroll-mt-32">
              <CollegeContentSection>
                <CardHeader><CardTitle className="font-heading flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> Student Reviews</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-6 p-4 bg-secondary/30 rounded-lg">
                    <div className="text-center self-center sm:self-auto shrink-0">
                      <div className="text-4xl font-heading font-bold text-primary">{overallRating}</div>
                      <div className="flex items-center gap-0.5 justify-center mt-1">
                        {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(Number(overallRating)) ? "fill-accent text-accent" : "text-muted-foreground"}`} />)}
                      </div>
                    </div>
                    <div className="flex-1 w-full space-y-2 min-w-0">
                      {ratingAspects.slice(0, 5).map((a: any) => (
                        <div key={a.label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground truncate pr-2">{a.label}</span>
                            <span className="text-xs font-semibold shrink-0">{a.score}/5</span>
                          </div>
                          <Progress value={Number(a.score) * 20} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                  {reviewsList.map((review: any, i: number) => (
                    <div key={i} className="border border-border rounded-xl p-5 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div><span className="font-semibold text-foreground">{review.name}</span><span className="text-xs text-muted-foreground ml-2">{review.year}</span></div>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, j) => <Star key={j} className={`w-3.5 h-3.5 ${j < Number(review.rating) ? "fill-accent text-accent" : "text-muted-foreground"}`} />)}
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="bg-primary dark:bg-primary/30 border border-primary dark:border-primary rounded-lg p-3">
                          <div className="flex items-center gap-1 mb-1.5 text-primary dark:text-primary text-sm font-semibold"><ThumbsUp className="w-3.5 h-3.5" /> Positives</div>
                          <p className="text-xs text-primary dark:text-primary leading-relaxed">{review.positives}</p>
                        </div>
                        <div className="bg-destructive dark:bg-destructive/30 border border-destructive dark:border-destructive rounded-lg p-3">
                          <div className="flex items-center gap-1 mb-1.5 text-destructive dark:text-destructive text-sm font-semibold"><ThumbsDown className="w-3.5 h-3.5" /> Negatives</div>
                          <p className="text-xs text-destructive dark:text-destructive leading-relaxed">{review.negatives}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <AIExtensionBlock section={getAIExtension("reviews")} extensionLabel="Aggregated Student Sentiment" entityName={college.name} entityWebsite={(college as any).website} />
                </CardContent>
              </CollegeContentSection>
            </div>

            {/* Gallery */}
            <div id="gallery" ref={el => { sectionRefs.current["gallery"] = el; }} className="scroll-mt-32">
              <CollegeContentSection>
                <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Image className="w-5 h-5 text-primary" /> Campus Gallery</CardTitle></CardHeader>
                <CardContent>
                  {galleryImages.length > 0 ? <CollegeAutoSlider items={galleryImages} label="Campus photos" render={(image: string, i: number) => (
                    <figure className="overflow-hidden rounded-lg border border-border bg-card">
                      <img src={cdnImage(image, { width: 640 })} alt={`${college.name} campus photo ${i + 1}`} width={640} height={426} className="w-full aspect-[3/2] object-cover" loading="lazy" decoding="async" />
                      <figcaption className="px-4 py-3 text-sm text-muted-foreground">{college.name} · {i + 1} / {galleryImages.length}</figcaption>
                    </figure>
                  )} /> : <p className="text-muted-foreground">Campus photos have not been published.</p>}
                </CardContent>
              </CollegeContentSection>
            </div>

            {/* Scholarships — filter-wise slider */}
            <div id="scholarships" ref={el => { sectionRefs.current["scholarships"] = el; }} className="scroll-mt-32">
              <CollegeContentSection>
                <div className="relative border-y border-border bg-secondary/50 px-6 py-6">
                  <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-card/10" />
                  <div className="pointer-events-none absolute -bottom-12 left-1/3 w-32 h-32 rounded-full bg-card/5" />
                  <div className="relative flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-card/15 border border-border/25 backdrop-blur flex items-center justify-center shadow-lg">
                        <Banknote className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <h2 className="font-heading text-xl font-extrabold text-foreground leading-tight">Scholarships &amp; Financial Aid</h2>
                        <p className="text-muted-foreground text-xs mt-0.5">Merit, entrance-score and special-category awards at {college.name}</p>
                      </div>
                    </div>
                    {maxScholarship && (
                      <div className="rounded-xl bg-card/15 border border-border/25 backdrop-blur px-5 py-2.5 text-center shadow-lg">
                        <div className="font-heading text-lg font-extrabold text-foreground leading-tight">Up to {maxScholarship}</div>
                        <div className="text-sm uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">Scholarship available</div>
                      </div>
                    )}
                  </div>
                </div>
                <CardContent className="pt-6">
                  {scholarshipNote && (
                    <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-accent/30 bg-gradient-to-r from-accent/15 to-accent/5 px-4 py-3">
                      <Award className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-foreground">{scholarshipNote}</p>
                    </div>
                  )}
                  {scholarshipCategories.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-1 px-1 scrollbar-thin" role="tablist" aria-label="Scholarship categories">
                      {["All", ...scholarshipCategories].map((cat) => (
                        <Button variant="ghost"
                          key={cat}
                          type="button"
                          role="tab"
                          aria-selected={scholarshipCat === cat}
                          onClick={() => {
                            setScholarshipCat(cat);
                          }}
                          className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold border transition-all duration-300 ${
                            scholarshipCat === cat
                              ? "bg-primary text-primary-foreground border-transparent shadow-md shadow-primary/30 scale-[1.03]"
                              : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground hover:bg-primary/5"
                          }`}
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>
                  )}
                  <CollegeAutoSlider key={scholarshipCat} items={filteredScholarships} label="Scholarships" render={(s: any, i: number) => (
                        <div
                          className="group relative snap-start shrink-0 h-full rounded-lg border border-border/60 bg-gradient-to-b from-card to-primary/5 p-5 pt-6 flex flex-col overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 transition-all duration-300"
                        >
                          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-primary to-primary pointer-events-none" />
                          <div className="pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors" />
                          {s.category && (
                            <span className="self-start text-sm font-bold uppercase tracking-wider text-primary dark:text-primary bg-primary/10 border border-primary/25 rounded-full px-2.5 py-1 mb-3">
                              {s.category}
                            </span>
                          )}
                          {s.name && <h4 className="font-heading font-semibold text-foreground text-base leading-snug break-words mb-1">{s.name}</h4>}
                          {s.level && <div className="font-heading font-bold text-foreground text-base leading-snug">{s.level}</div>}
                          {s.criteria && <p className="text-xs text-muted-foreground mt-1.5 break-words flex-1 leading-relaxed">{s.criteria}</p>}
                          {s.description && <p className="text-xs text-muted-foreground mt-1.5 break-words flex-1 leading-relaxed">{s.description}</p>}
                          {s.amount && (
                            <div className="mt-4 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/25 px-3 py-3 text-center">
                              <div className="font-heading font-extrabold text-primary dark:text-primary text-xl leading-tight">{s.amount}</div>
                              <div className="text-sm uppercase tracking-wider text-muted-foreground font-semibold mt-1">Scholarship Amount</div>
                            </div>
                          )}
                        </div>
                  )} />
                  {scholarshipPolicy.length > 0 && (
                    <div className="mt-6 rounded-2xl border border-border/60 bg-gradient-to-br from-muted/40 to-transparent p-5">
                      <h4 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" /> Scholarship Policy
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {scholarshipPolicy.map((p, i) => (
                          <div key={i} className="flex items-start gap-3 rounded-xl bg-card border border-border/50 px-3.5 py-3">
                            <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary text-primary-foreground text-sm font-extrabold flex items-center justify-center mt-0.5">{i + 1}</span>
                            <span className="text-sm text-muted-foreground leading-relaxed">{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <AIExtensionBlock section={getAIExtension("scholarships")} extensionLabel="Scholarship Eligibility Guide" entityName={college.name} entityWebsite={(college as any).website} />
                </CardContent>
              </CollegeContentSection>
            </div>

            {/* Faculty */}
            <div id="faculty" ref={el => { sectionRefs.current["faculty"] = el; }} className="scroll-mt-32">
              <CollegeContentSection>
                <CardHeader><CardTitle className="font-heading">Faculty Profiles</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {facultyList.map((f: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border">
                        {f.photo_url ? (
                          <img src={f.photo_url} alt={f.name} width={48} height={48} className="w-12 h-12 rounded-full object-cover shrink-0" loading="lazy" decoding="async" />
                        ) : (
                          <div className="w-12 h-12 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                            {f.name.split(" ").slice(-1).map((n: string) => n[0]).join("")}
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-foreground text-sm">{f.name}</h4>
                          <p className="text-xs text-primary font-medium">{f.department}</p>
                          <p className="text-xs text-muted-foreground">{f.qualification} • {f.experience}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <AIExtensionBlock section={getAIExtension("faculty")} extensionLabel="Faculty & Research Strengths" entityName={college.name} entityWebsite={(college as any).website} />
                </CardContent>
              </CollegeContentSection>
            </div>

            {/* Hostel & Campus */}
            <div id="hostel" ref={el => { sectionRefs.current["hostel"] = el; }} className="scroll-mt-32">
              <CollegeContentSection>
                <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Home className="w-5 h-5 text-primary" /> Hostel & Campus Life</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    {[
                      { label: "Campus Size", value: hostelData.campus_size || college.campus_size || "N/A", icon: Building },
                      { label: "Total Students", value: hostelData.total_students || (college.total_students ? `${college.total_students}+` : "N/A"), icon: Users },
                      { label: "Hostel Rooms", value: hostelData.hostel_rooms || "Single & Double", icon: Home },
                      { label: "Library", value: hostelData.library || "24/7 Access", icon: BookOpen },
                    ].map((item, i) => (
                      <div key={i} className="bg-secondary/50 rounded-lg p-4 flex items-center gap-3">
                        <item.icon className="w-6 h-6 text-primary shrink-0" />
                        <div><div className="text-xs text-muted-foreground">{item.label}</div><div className="font-semibold text-foreground text-sm">{item.value}</div></div>
                      </div>
                    ))}
                  </div>
                  <h4 className="font-heading font-semibold text-foreground mb-3">Campus Facilities</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {hostelFacilities.map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-foreground"><CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />{f}</div>
                    ))}
                  </div>
                  {getSectionContent("hostel") && (
                    <div className="mt-4 ai-content max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: enhanceAIContent(getSectionContent("hostel"), { entityName: college.name, entityWebsite: (college as any).website }) }} />
                  )}
                  <AIExtensionBlock section={getAIExtension("hostel")} extensionLabel="Campus Life Deep-Dive" entityName={college.name} entityWebsite={(college as any).website} />
                </CardContent>
              </CollegeContentSection>
            </div>

            {/* Q&A */}
            <div id="qa" ref={el => { sectionRefs.current["qa"] = el; }} className="scroll-mt-32">
              <CollegeContentSection>
                <CardHeader><CardTitle className="font-heading flex items-center gap-2"><HelpCircle className="w-5 h-5 text-primary" /> Frequently Asked Questions</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {qaItems.map((item: any, i: number) => (
                      <div key={i} className="border border-border rounded-lg overflow-hidden">
                        <button onClick={() => setQaOpen(qaOpen === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors">
                          <span className="font-medium text-foreground text-sm pr-4">{item.q}</span>
                          {qaOpen === i ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                        </button>
                        <AnimatePresence>
                          {qaOpen === i && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollegeContentSection>
            </div>

            {/* News */}
            <div id="news" ref={el => { sectionRefs.current["news"] = el; }} className="scroll-mt-32">
              <CollegeContentSection>
                <CardHeader><CardTitle className="font-heading">Latest News & Articles</CardTitle></CardHeader>
                <CardContent>
                  {(relatedArticles || []).length > 0 ? (
                    <div className="space-y-3">
                      {(relatedArticles || []).map((article: any) => (
                        <Link key={article.id} to={`/article/${article.slug}`} className="block p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">{article.category}</Badge>
                            <span className="text-xs text-muted-foreground">{new Date(article.created_at).toLocaleDateString()}</span>
                          </div>
                          <h4 className="font-semibold text-foreground text-sm">{article.title}</h4>
                          {article.excerpt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.excerpt}</p>}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-6">No related articles yet.</p>
                  )}
                </CardContent>
              </CollegeContentSection>
            </div>
          </div>

          {/* ===== Premium Sidebar ===== */}
          <aside className="hidden lg:block min-w-0 w-full self-start" aria-label={`${college.name} quick actions and summary`}>
            <div className="sticky top-32 max-h-[calc(100vh-9rem)] overflow-y-auto flex flex-col gap-4 z-10">
              <div data-ad-sidebar className="order-last shrink-0" />
              {/* Premium Fees + Brochure Card — pinned at top of sticky sidebar */}
              <Card className="shrink-0 overflow-hidden border-0 shadow-2xl shadow-primary/15 bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-primary-foreground relative">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-card/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-card/5 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(hsl(0 0% 100%) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                <CardContent className="px-5 py-5 relative z-10">
                  <div className="flex flex-col gap-2 mb-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider bg-accent text-accent px-2 py-0.5 rounded-md shadow-md">
                        ★ Featured
                      </span>
                      {applyUrl && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider bg-card/15 border border-border/25 text-primary-foreground px-2 py-0.5 rounded-md">
                          <LiveDot /> Applications Open
                        </span>
                      )}
                    </div>
                    <span className="text-xs uppercase tracking-wider text-primary-foreground/70 font-semibold">Total Program Fees</span>
                  </div>
                  <p className="font-heading text-2xl xl:text-3xl font-extrabold leading-tight mb-1 break-words [text-shadow:_0_2px_8px_rgb(0_0_0_/_0.15)]">
                    {college.fees_lakhs ? `₹${college.fees_lakhs}L` : numericStat(college.fees, "Contact College")}
                  </p>
                  <p className="text-xs text-primary-foreground/75 mb-5">For complete 2-year program · GST inclusive</p>


                  <Button onClick={handleDownloadBrochure} size="lg" className="w-full bg-card text-primary hover:bg-card/95 font-bold gap-2 shadow-xl mb-2">
                    <Download className="w-4 h-4" /> Download Brochure
                  </Button>
                  {applyUrl ? (
                    <motion.a
                      href={applyUrl}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      aria-label={`${applyLabel} — official application form for ${college.name}`}
                      className="block"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button variant="outline" className="w-full bg-accent border-accent text-accent hover:bg-accent hover:border-accent hover:text-accent font-bold gap-2 shadow-lg">
                        <GraduationCap className="w-4 h-4" /> {applyLabel}
                      </Button>
                    </motion.a>
                  ) : (
                    <Button onClick={() => sectionRefs.current["admission"]?.scrollIntoView({ behavior: "smooth" })} variant="outline" className="w-full bg-card/10 backdrop-blur-sm border-border/30 text-primary-foreground hover:bg-card/20 hover:text-primary-foreground hover:border-border/50 font-semibold gap-2">
                      <GraduationCap className="w-4 h-4" /> Apply Now
                    </Button>
                  )}

                  <div className="mt-5 pt-4 border-t border-border/20 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-base font-extrabold">100%</div>
                      <div className="text-xs text-primary-foreground/70 uppercase tracking-wider">Verified</div>
                    </div>
                    <div className="border-x border-border/20">
                      <div className="text-base font-extrabold">Free</div>
                      <div className="text-xs text-primary-foreground/70 uppercase tracking-wider">Brochure</div>
                    </div>
                    <div>
                      <div className="text-base font-extrabold">24h</div>
                      <div className="text-xs text-primary-foreground/70 uppercase tracking-wider">Response</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="overflow-y-auto overflow-x-hidden pr-1 space-y-4 min-h-0">
                <CollegeSectionNav
                  className="w-full"
                  topOffset={140}
                  items={tabItems.map((item) => ({ id: item.value, label: item.label }))}
                />

                {/* Animated application strip — quick entry to the official form */}
                {applyUrl && <SidebarApplyStrip collegeName={college.name} applyUrl={applyUrl} applyLabel={applyLabel} />}

                {/* Placement Snapshot — key outcomes at a glance */}
                {(college.placement_avg || college.placement_highest) && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
                    <PlacementSnapshotCard
                      college={college}
                      topRecruiters={topRecruiters}
                      onViewPlacements={() => sectionRefs.current["placements"]?.scrollIntoView({ behavior: "smooth" })}
                      reportUrl={placementReportUrl}
                    />
                  </motion.div>
                )}

                {/* You May Also Like */}
                {suggestedColleges.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
                  <Card className="overflow-hidden border-border/60">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Star className="w-4 h-4 text-accent" />
                        </div>
                        <h4 className="font-heading font-bold text-foreground">You May Also Like</h4>
                      </div>
                      <div className="space-y-2">
                        {suggestedColleges.slice(0, 5).map((sc) => (
                          <Link key={sc.slug} to={`/college/${sc.slug}`} className="block p-3 rounded-xl hover:bg-primary/5 border border-border hover:border-primary/30 transition-all group/sc">
                            <div className="flex items-start gap-2">
                              {sc.ranking && (
                                <span className="text-xs font-extrabold text-accent bg-accent border border-accent px-1.5 py-0.5 rounded-[0.25rem] shrink-0">#{sc.ranking}</span>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-foreground text-sm group-hover/sc:text-primary transition-colors line-clamp-1">{sc.name}</div>
                                <div className="text-xs text-muted-foreground line-clamp-1">{sc.city} · {numericStat(sc.fees)}</div>
                              </div>
                              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground rotate-90 group-hover/sc:text-primary group-hover/sc:translate-x-0.5 transition-all shrink-0" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                )}

                {/* Compare Card */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
                <Card className="overflow-hidden border-border/60 hover:border-primary/30 transition-colors group">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <TrendingUp className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-heading font-bold text-foreground text-sm">Compare Colleges</h4>
                        <p className="text-xs text-muted-foreground">Side-by-side analysis of fees, placements & more.</p>
                      </div>
                    </div>
                    <Link to="/compare" aria-label={`Compare ${college.name} with other MBA colleges`}>
                      <Button variant="outline" className="w-full font-semibold border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                        Open Compare Tool
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
                </motion.div>

                {/* Quick Info Card */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 }}>
                  <QuickInfoCard college={college} accreditations={accreditations} applyUrl={applyUrl} applyLabel={applyLabel} quickItems={quickInfoItems} />
                </motion.div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      {college?.id && <PageKeywords contentType="college" recordId={college.id} fallbackKeywords={(college as any).keywords || []} />}

      {/* Mobile-first: Floating TOC + Sticky action bar */}
      <FloatingTOC
        className="lg:hidden"
        items={tabItems.map(t => ({ id: t.value, label: t.label }))}
        onSelect={scrollToSection}
        bottomOffset={88}
      />
      <MobileActionBar
        actions={[
          applyUrl
            ? { icon: <GraduationCap />, label: "Apply", primary: true, onClick: () => window.open(applyUrl, "_blank", "noopener,noreferrer") }
            : { icon: <Phone />, label: "Enquire", primary: true, onClick: () => sectionRefs.current["overview"]?.scrollIntoView({ behavior: "smooth" }) },
          { icon: <Download />, label: "Brochure", onClick: handleDownloadBrochure },
          { icon: <Share2 />, label: "Share", onClick: () => { if (navigator.share) navigator.share({ title: college.name, url: window.location.href }); else { navigator.clipboard.writeText(window.location.href); toast({ title: "Link copied!" }); } } },
        ]}
      />
      <div className="md:hidden h-20" aria-hidden />
    </div>
  );
};

export default CollegeDetailPage;
