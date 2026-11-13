import { GraduationCap } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CollegeDataDossiers from "./CollegeDataDossiers";
import CollegeContentSection from "./CollegeContentSection";
import type { ProgrammeCourse } from "@/hooks/useProgrammeCourses";

interface Props {
  collegeSlug: string;
  programmes: ProgrammeCourse[];
  fallbackCourses?: { name?: string; duration?: string; eligibility?: string; fees?: string; specializations?: string | string[] }[];
}

const acceptedExamLabels = (p: ProgrammeCourse) => {
  const arr: string[] = [];
  if (p.accepts_cat) arr.push("CAT");
  if (p.accepts_xat) arr.push("XAT");
  if (p.accepts_gmat) arr.push("GMAT");
  if (p.accepts_gre) arr.push("GRE");
  if (p.accepts_cmat) arr.push("CMAT");
  if (p.accepts_nmat) arr.push("NMAT");
  if (p.accepts_snap) arr.push("SNAP");
  if (p.accepts_iift) arr.push("IIFT");
  if (Array.isArray(p.accepts_other_exams)) arr.push(...p.accepts_other_exams);
  return arr;
};

// Imported rows sometimes carry literal "undefined"/"NA"/"null" strings — treat them as missing.
const clean = (v: unknown): string => {
  if (typeof v !== "string") return "";
  const t = v.trim();
  return /^(undefined|null|na|n\/a|-)$/i.test(t) ? "" : t;
};

const eligibilitySummary = (p: ProgrammeCourse) => {
  const bits: string[] = [];
  if (p.min_graduation_percent != null) bits.push(`Grad ≥ ${p.min_graduation_percent}%`);
  const cat = clean(p.cat_percentile_target);
  const xat = clean(p.xat_percentile_target);
  const gmat = clean(p.gmat_score_target);
  if (p.accepts_cat && cat) bits.push(`CAT ${cat}%`);
  if (p.accepts_xat && xat) bits.push(`XAT ${xat}%`);
  if (p.accepts_gmat && gmat) bits.push(`GMAT ${gmat}`);
  if ((p.min_work_ex_months || 0) > 0) bits.push(`Work-ex ≥ ${Math.round((p.min_work_ex_months || 0) / 12)}y`);
  return bits.join(" · ") || "—";
};

const ProgrammePortfolioTable = ({ programmes, fallbackCourses }: Props) => {
  return <CollegeContentSection>
    <CardHeader><CardTitle className="font-heading flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" />Programmes & Fees</CardTitle></CardHeader>
    <CardContent>
      {programmes.length > 0 ? <CollegeDataDossiers rows={programmes} label="Programmes" columns={[
        { label: "Programme", value: (p) => <span>{p.name}<span className="mt-1 block text-sm font-normal text-muted-foreground">{[p.programme_type, p.mode].filter(Boolean).join(" · ")}</span></span> },
        { label: "Duration", value: (p) => clean(p.duration) },
        { label: "Total fees", value: (p) => <span className="text-primary">{p.fees_total_lakhs ? `₹${p.fees_total_lakhs} L` : "—"}{p.fees_year && <span className="block text-sm font-normal text-muted-foreground">{p.fees_year}</span>}</span> },
        { label: "Accepted exams", value: (p) => acceptedExamLabels(p).join(" · ") || "—" },
        { label: "Specialisations", value: (p) => (p.specializations || []).join(" · ") },
        { label: "Eligibility", value: (p) => eligibilitySummary(p) },
        { label: "Seats", value: (p) => p.intake_seats },
      ]} /> : fallbackCourses?.length ? <CollegeDataDossiers rows={fallbackCourses} label="Programmes" columns={[
        { label: "Programme", value: (p) => p.name }, { label: "Duration", value: (p) => p.duration },
        { label: "Eligibility", value: (p) => p.eligibility }, { label: "Fees", value: (p) => p.fees },
      ]} /> : <p className="text-muted-foreground">Programme portfolio coming soon.</p>}
    </CardContent>
  </CollegeContentSection>;
};

export default ProgrammePortfolioTable;
