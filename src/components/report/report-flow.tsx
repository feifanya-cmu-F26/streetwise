"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { issueTypeLabels } from "@/lib/issues/labels";
import { analyzeRequestSchema, type IssueAnalysis } from "@/schemas/analysis";
import {
  analysisResponseSchema,
  issueResponseSchema,
  submissionResponseSchema,
} from "@/schemas/api";
import { issueTypeSchema, reportSchema } from "@/schemas/issue";
import type { SubmissionResult } from "@/schemas/submission";

export function ReportFlow() {
  const [analysis, setAnalysis] = useState<IssueAnalysis | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const parsed = analyzeRequestSchema.safeParse({
      mode: "demo",
      demoIssueType: form.get("type"),
      location: {
        lat: Number(form.get("lat")),
        lng: Number(form.get("lng")),
        address: form.get("address"),
      },
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const { data } = await apiFetch(
        "/api/issues/analyze",
        analysisResponseSchema,
        { method: "POST", body: JSON.stringify(parsed.data) },
      );
      setAnalysis(data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Demo analysis failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!analysis) return;
    const form = new FormData(event.currentTarget);
    const parsed = reportSchema.safeParse({
      title: form.get("title"),
      description: form.get("description"),
      category: analysis.issueType,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      let id = createdId;
      if (!id) {
        const created = await apiFetch("/api/issues", issueResponseSchema, {
          method: "POST",
          body: JSON.stringify({ analysis, report: parsed.data }),
        });
        id = created.data.id;
        setCreatedId(id);
      }
      const prepared = await apiFetch(
        `/api/issues/${id}/submit`,
        submissionResponseSchema,
        {
          method: "POST",
          body: JSON.stringify({ mode: "demo", reviewed: true }),
        },
      );
      setResult(prepared.data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Demo preparation failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
      <Button asChild variant="ghost" className="mb-7 -ml-4">
        <Link href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to neighborhood
        </Link>
      </Button>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Demo report
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {result
          ? "Ready for the next step."
          : analysis
            ? "Review your sample report."
            : "Try the reporting flow."}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Use sample inputs to explore the workflow. Photo upload, AI analysis,
        and government submission are not connected.
      </p>
      <ol
        aria-label="Report progress"
        className="my-8 flex gap-3 text-xs sm:gap-6"
      >
        {["Sample input", "Review", "Prepared"].map((label, i) => (
          <li
            key={label}
            aria-current={
              i === (result ? 2 : analysis ? 1 : 0) ? "step" : undefined
            }
            className="border-b-2 border-border pb-2 aria-[current=step]:border-primary aria-[current=step]:font-bold"
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>
      {result ? (
        <section
          className="rounded-xl border border-border bg-white p-6"
          aria-label="Preparation result"
        >
          <CheckCircle2 size={32} className="mb-4" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Demo report prepared</h2>
          <p role="status" className="mt-3 leading-7">
            {result.message}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Government status: Not submitted. Authority: Needs review.
          </p>
          <Button asChild className="mt-6">
            <Link href={`/?issue=${result.issueId}`}>
              View the sample issue
            </Link>
          </Button>
        </section>
      ) : analysis ? (
        <form
          onSubmit={prepare}
          className="space-y-5 rounded-xl border border-border bg-white p-6"
        >
          <div className="rounded-lg bg-muted p-4 text-sm leading-6">
            <strong>Authority needs review.</strong> No real jurisdiction or
            duplicate check was performed.
          </div>
          <p className="text-sm text-muted-foreground">
            {analysis.location.address || "Selected location"} ·{" "}
            {analysis.location.lat}, {analysis.location.lng}
          </p>
          <label>
            Report title
            <input
              name="title"
              defaultValue={analysis.generatedReport.title}
              required
              maxLength={160}
              readOnly={!!createdId}
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              rows={5}
              defaultValue={analysis.generatedReport.description}
              required
              maxLength={4000}
              readOnly={!!createdId}
            />
          </label>
          <label className="flex items-start gap-3 font-normal">
            <input
              type="checkbox"
              required
              className="mt-0.5! size-5! min-h-0! w-5! shrink-0"
            />
            I reviewed this sample and understand that nothing will be sent to a
            government agency.
          </label>
          {createdId && (
            <p role="status" className="text-sm">
              Your sample issue is saved in this demo process. Retrying only
              prepares the existing report.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>
              {busy
                ? "Preparing…"
                : createdId
                  ? "Retry preparation"
                  : "Prepare demo report"}
            </Button>
            {!createdId && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setAnalysis(null);
                  setError("");
                }}
              >
                Change sample input
              </Button>
            )}
          </div>
        </form>
      ) : (
        <form
          onSubmit={analyze}
          className="space-y-5 rounded-xl border border-border bg-white p-6"
        >
          <label>
            Sample issue type
            <select name="type" defaultValue="pothole">
              {issueTypeSchema.options.map((type) => (
                <option key={type} value={type}>
                  {issueTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Location label
            <input
              name="address"
              defaultValue="Mountain View · sample location"
              maxLength={300}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              Latitude
              <input
                name="lat"
                type="number"
                step="any"
                min={-90}
                max={90}
                defaultValue={37.394}
                required
              />
            </label>
            <label>
              Longitude
              <input
                name="lng"
                type="number"
                step="any"
                min={-180}
                max={180}
                defaultValue={-122.081}
                required
              />
            </label>
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Preparing sample…" : "Generate sample analysis"}
          </Button>
        </form>
      )}
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
    </main>
  );
}
