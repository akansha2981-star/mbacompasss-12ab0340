import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RATING_PARAMETERS } from "@/lib/coachingReviews";
import {
  addCoachingAliasFn,
  coachingReviewDashboardFn,
  exportCoachingReviewsFn,
  listCoachingReviewInstitutesFn,
  listCoachingReviewsFn,
  mergeCoachingInstitutesFn,
  moderateCoachingReviewFn,
  saveCoachingReviewInstituteFn,
} from "@/lib/coachingReviews.functions";

type Dashboard = Awaited<ReturnType<typeof coachingReviewDashboardFn>>;
type ReviewRow = Awaited<ReturnType<typeof listCoachingReviewsFn>>["reviews"][number];
type InstituteRow = Awaited<ReturnType<typeof listCoachingReviewInstitutesFn>>[number];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
  flagged: "outline",
};

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminCoachingReviews() {
  const { toast } = useToast();
  const dashboardFn = useServerFn(coachingReviewDashboardFn);
  const listFn = useServerFn(listCoachingReviewsFn);
  const moderateFn = useServerFn(moderateCoachingReviewFn);
  const institutesFn = useServerFn(listCoachingReviewInstitutesFn);
  const saveInstituteFn = useServerFn(saveCoachingReviewInstituteFn);
  const aliasFn = useServerFn(addCoachingAliasFn);
  const mergeFn = useServerFn(mergeCoachingInstitutesFn);
  const exportFn = useServerFn(exportCoachingReviewsFn);

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [institutes, setInstitutes] = useState<InstituteRow[]>([]);
  const [instituteStatus, setInstituteStatus] = useState<string>("all");
  const [viewing, setViewing] = useState<ReviewRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editComment, setEditComment] = useState("");
  const [newInstitute, setNewInstitute] = useState("");
  const [aliasDrafts, setAliasDrafts] = useState<Record<string, string>>({});
  const [mergeTarget, setMergeTarget] = useState<Record<string, string>>({});
  const [exportScope, setExportScope] = useState<string>("all");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [busy, setBusy] = useState(false);

  const loadDashboard = useCallback(async () => {
    setDashboard(await dashboardFn({ data: {} }));
  }, [dashboardFn]);

  const loadReviews = useCallback(async () => {
    const result = await listFn({
      data: {
        status: statusFilter === "all" ? null : (statusFilter as any),
        search: search || null,
        page: reviewPage,
      },
    });
    setReviews(result.reviews as ReviewRow[]);
    setReviewsTotal(result.total);
  }, [listFn, statusFilter, search, reviewPage]);

  const loadInstitutes = useCallback(async () => {
    const rows = await institutesFn({ data: { status: instituteStatus === "all" ? null : (instituteStatus as any) } });
    setInstitutes(rows as InstituteRow[]);
  }, [institutesFn, instituteStatus]);

  useEffect(() => {
    loadDashboard().catch(() => toast({ title: "Could not load dashboard", variant: "destructive" }));
  }, [loadDashboard, toast]);
  useEffect(() => {
    loadReviews().catch(() => toast({ title: "Could not load reviews", variant: "destructive" }));
  }, [loadReviews, toast]);
  useEffect(() => {
    loadInstitutes().catch(() => toast({ title: "Could not load institutes", variant: "destructive" }));
  }, [loadInstitutes, toast]);

  const moderate = async (reviewId: string, action: "approve" | "reject" | "flag" | "delete", edits?: { student_name?: string; review_comment?: string }) => {
    setBusy(true);
    try {
      await moderateFn({ data: { reviewId, action, edits } });
      toast({ title: `Review ${action}d` });
      setViewing(null);
      await Promise.all([loadReviews(), loadDashboard()]);
    } catch (err) {
      toast({ title: "Action failed", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const runExport = async () => {
    setBusy(true);
    try {
      const result = await exportFn({ data: { scope: exportScope as any, from: exportFrom || null, to: exportTo || null } });
      downloadCsv(result.filename, result.csv);
      toast({ title: "Export downloaded" });
    } catch (err) {
      toast({ title: "Export failed", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const metrics: { label: string; value: string | number }[] = dashboard
    ? [
        { label: "Total Reviews", value: dashboard.total },
        { label: "Approved", value: dashboard.approved },
        { label: "Pending", value: dashboard.pending },
        { label: "Rejected", value: dashboard.rejected },
        { label: "Flagged", value: dashboard.flagged },
        { label: "Institutes", value: dashboard.totalInstitutes },
        { label: "Unique Students", value: dashboard.uniqueStudents },
        { label: "Avg Platform Rating", value: dashboard.platformAvg ?? "—" },
        { label: "Submitted Today", value: dashboard.today },
        { label: "Submitted This Month", value: dashboard.thisMonth },
      ]
    : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Coaching Reviews</h1>
        <p className="text-base text-muted-foreground">Moderate student reviews, manage institutes and aliases, export data.</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="institutes">Institutes</TabsTrigger>
          <TabsTrigger value="export">CSV Export</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {metrics.map((m) => (
              <Card key={m.label}>
                <CardContent className="py-4">
                  <p className="text-sm text-muted-foreground">{m.label}</p>
                  <p className="text-xl font-bold text-foreground">{m.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Daily submissions (last 30 days)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dashboard?.daily.length ? (
                  dashboard.daily.map((d) => (
                    <div key={d.date} className="grid grid-cols-[90px_1fr_32px] items-center gap-2">
                      <p className="text-sm text-muted-foreground">{d.date.slice(5)}</p>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(d.count / Math.max(...dashboard.daily.map((x) => x.count))) * 100}%` }}
                        />
                      </div>
                      <p className="text-right text-sm text-foreground">{d.count}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No submissions yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Rating distribution (approved)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dashboard &&
                  ["1-2", "3-4", "5-6", "7-8", "9-10"].map((bucket, i) => (
                    <div key={bucket} className="grid grid-cols-[48px_1fr_32px] items-center gap-2">
                      <p className="text-sm text-muted-foreground">{bucket}</p>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(dashboard.distribution[i] / Math.max(1, ...dashboard.distribution)) * 100}%` }}
                        />
                      </div>
                      <p className="text-right text-sm text-foreground">{dashboard.distribution[i]}</p>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Most reviewed institutes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {dashboard?.mostReviewed.length ? (
                  dashboard.mostReviewed.map((i) => (
                    <p key={i.name} className="flex justify-between text-base text-foreground">
                      <span>{i.name}</span>
                      <span className="text-muted-foreground">{i.count} reviews</span>
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No approved reviews yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Highest and lowest rated</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-muted-foreground">Highest</p>
                  {dashboard?.highestRated.slice(0, 5).map((i) => (
                    <p key={i.name} className="flex justify-between text-base text-foreground">
                      <span>{i.name}</span>
                      <span className="font-semibold">{i.avg}</span>
                    </p>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-muted-foreground">Lowest</p>
                  {dashboard?.lowestRated.slice(0, 5).map((i) => (
                    <p key={i.name} className="flex justify-between text-base text-foreground">
                      <span>{i.name}</span>
                      <span className="font-semibold">{i.avg}</span>
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search student name or email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setReviewPage(1);
              }}
              className="max-w-xs"
            />
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setReviewPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Institute</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{r.student_name}</p>
                      <p className="text-sm text-muted-foreground">{r.student_email}</p>
                    </TableCell>
                    <TableCell className="text-sm">{(r as any).coaching_review_institutes?.canonical_name ?? "—"}</TableCell>
                    <TableCell className="text-sm font-semibold">{Number(r.average_rating).toFixed(1)}</TableCell>
                    <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.moderation_status] ?? "secondary"}>{r.moderation_status}</Badge>
                      {r.flag_reasons?.length ? <p className="mt-1 text-sm text-destructive">{r.flag_reasons.join(", ")}</p> : null}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setViewing(r);
                          setEditName(r.student_name);
                          setEditComment(r.review_comment);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {reviews.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No reviews match these filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={reviewPage <= 1} onClick={() => setReviewPage((p) => p - 1)}>
              Previous
            </Button>
            <p className="text-sm text-muted-foreground">
              Page {reviewPage} · {reviewsTotal} reviews
            </p>
            <Button variant="outline" size="sm" disabled={reviewPage * 25 >= reviewsTotal} onClick={() => setReviewPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="institutes" className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Add new institute</Label>
              <div className="flex gap-2">
                <Input value={newInstitute} onChange={(e) => setNewInstitute(e.target.value)} placeholder="Canonical name" className="max-w-xs" />
                <Button
                  disabled={busy || newInstitute.trim().length < 2}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await saveInstituteFn({ data: { canonicalName: newInstitute.trim(), status: "active" } });
                      setNewInstitute("");
                      toast({ title: "Institute added" });
                      await loadInstitutes();
                    } catch (err) {
                      toast({ title: "Could not add institute", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
            <Select value={instituteStatus} onValueChange={setInstituteStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending approval</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institute</TableHead>
                  <TableHead>Aliases</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviews</TableHead>
                  <TableHead>Avg</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {institutes.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{i.canonical_name}</p>
                      <p className="text-sm text-muted-foreground">/coaching-review/{i.slug}</p>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="text-sm text-muted-foreground">
                        {(i as any).coaching_review_aliases?.map((a: any) => a.alias_name).join(", ") || "—"}
                      </p>
                      <div className="mt-1 flex gap-1">
                        <Input
                          placeholder="Add alias"
                          value={aliasDrafts[i.id] ?? ""}
                          onChange={(e) => setAliasDrafts((p) => ({ ...p, [i.id]: e.target.value }))}
                          className="h-8 text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy || (aliasDrafts[i.id] ?? "").trim().length < 2}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await aliasFn({ data: { instituteId: i.id, alias: (aliasDrafts[i.id] ?? "").trim() } });
                              setAliasDrafts((p) => ({ ...p, [i.id]: "" }));
                              await loadInstitutes();
                            } catch (err) {
                              toast({ title: "Alias failed", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={i.status === "active" ? "default" : i.status === "pending" ? "secondary" : "outline"}>{i.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{i.review_count}</TableCell>
                    <TableCell className="text-sm font-semibold">{i.avg_rating ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {i.status !== "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                await saveInstituteFn({ data: { id: i.id, canonicalName: i.canonical_name, status: "active" } });
                                toast({ title: "Institute activated" });
                                await loadInstitutes();
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            {i.status === "pending" ? "Approve" : "Activate"}
                          </Button>
                        )}
                        {i.status === "active" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                await saveInstituteFn({ data: { id: i.id, canonicalName: i.canonical_name, status: "hidden" } });
                                await loadInstitutes();
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            Hide
                          </Button>
                        )}
                        <Select
                          value={mergeTarget[i.id] ?? ""}
                          onValueChange={(v) => setMergeTarget((p) => ({ ...p, [i.id]: v }))}
                        >
                          <SelectTrigger className="h-8 w-[130px] text-sm">
                            <SelectValue placeholder="Merge into..." />
                          </SelectTrigger>
                          <SelectContent>
                            {institutes
                              .filter((t) => t.id !== i.id && t.status === "active")
                              .map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.canonical_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy || !mergeTarget[i.id]}
                          onClick={async () => {
                            if (!confirm(`Merge "${i.canonical_name}" into the selected institute? Its reviews and aliases move over.`)) return;
                            setBusy(true);
                            try {
                              await mergeFn({ data: { sourceId: i.id, targetId: mergeTarget[i.id] } });
                              toast({ title: "Institutes merged" });
                              await loadInstitutes();
                            } catch (err) {
                              toast({ title: "Merge failed", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Merge
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {institutes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No institutes yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Export CSV</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Dataset</Label>
                <Select value={exportScope} onValueChange={setExportScope}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reviews</SelectItem>
                    <SelectItem value="approved">Approved Reviews</SelectItem>
                    <SelectItem value="pending">Pending Reviews</SelectItem>
                    <SelectItem value="rejected">Rejected Reviews</SelectItem>
                    <SelectItem value="flagged">Flagged Reviews</SelectItem>
                    <SelectItem value="institutes">All Coaching Institutes</SelectItem>
                    <SelectItem value="ratings_summary">Ratings Summary (approved)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>From</Label>
                <Input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>To</Label>
                <Input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
              </div>
              <Button onClick={runExport} disabled={busy}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  {Number(viewing.average_rating).toFixed(1)} / 10 — {(viewing as any).coaching_review_institutes?.canonical_name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Student name</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input value={viewing.student_email} disabled />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {[viewing.exam_category, viewing.preparation_year, viewing.class_mode].filter(Boolean).join(" · ") || "No exam details"} ·
                  Submitted {new Date(viewing.created_at).toLocaleString("en-IN")}
                </p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {RATING_PARAMETERS.map((p) => (
                    <p key={p.key} className="text-sm text-muted-foreground">
                      {p.label}: <span className="font-medium text-foreground">{(viewing as any)[p.key]}/10</span>
                    </p>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label>Review comment</Label>
                  <Textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} rows={5} />
                </div>
                {viewing.flag_reasons?.length ? (
                  <p className="text-sm text-destructive">Flagged: {viewing.flag_reasons.join(", ")}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={busy}
                    onClick={() =>
                      moderate(viewing.id, "approve", {
                        student_name: editName !== viewing.student_name ? editName : undefined,
                        review_comment: editComment !== viewing.review_comment ? editComment : undefined,
                      })
                    }
                  >
                    Approve
                  </Button>
                  <Button variant="outline" disabled={busy} onClick={() => moderate(viewing.id, "flag")}>
                    Flag
                  </Button>
                  <Button variant="outline" disabled={busy} onClick={() => moderate(viewing.id, "reject")}>
                    Reject
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => {
                      if (confirm("Delete this review permanently?")) moderate(viewing.id, "delete");
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
