"use client";

import { useState } from "react";
import { ArrowLeft, Check, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { issueResponseSchema } from "@/schemas/api";
import { issueTypeLabels } from "@/lib/issues/labels";
import type { ConfirmationRequest, Issue } from "@/schemas/issue";

export function IssueDetail({
  issue,
  onBack,
  onUpdate,
}: {
  issue: Issue;
  onBack: () => void;
  onUpdate: (issue: Issue) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function confirm(kind: ConfirmationRequest["kind"]) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const { data } = await apiFetch(
        `/api/issues/${issue.id}/confirm`,
        issueResponseSchema,
        { method: "POST", body: JSON.stringify({ kind }) },
      );
      onUpdate(data);
      setMessage("Demo observation added. Government status is unchanged.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not add observation.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Issue details" className="p-5">
      <Button variant="ghost" onClick={onBack} className="mb-5 -ml-3">
        <ArrowLeft size={16} aria-hidden="true" />
        All sample issues
      </Button>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {issueTypeLabels[issue.type]} · {issue.severity} severity
      </p>
      <h2 className="mt-2 text-2xl font-semibold leading-tight">
        {issue.report.title}
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        {issue.location.address ||
          `${issue.location.lat}, ${issue.location.lng}`}
      </p>
      <p className="my-6 leading-7">{issue.report.description}</p>
      <dl className="space-y-4 border-y border-border py-5 text-sm">
        <div>
          <dt className="text-muted-foreground">Issue progress</dt>
          <dd className="mt-1 capitalize">
            {issue.status.replaceAll("_", " ")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Government status</dt>
          <dd className="mt-1 font-semibold">
            {issue.submission.status === "not_submitted"
              ? "Not submitted"
              : issue.submission.status.replaceAll("_", " ")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Responsible authority</dt>
          <dd className="mt-1">
            {issue.authority.status === "resolved"
              ? `${issue.authority.authority.name} (sample)`
              : "Needs review"}
          </dd>
        </div>
      </dl>
      <h3 className="mt-6 font-semibold">Community observations</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {issue.community.stillThere} still there · {issue.community.resolved}{" "}
        reported resolved
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => confirm("still_there")}
        >
          <Eye size={16} aria-hidden="true" />
          Still there
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => confirm("resolved")}
        >
          <Check size={16} aria-hidden="true" />
          Looks resolved
        </Button>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        These demo observations do not verify a repair or update government
        records.
      </p>
      {message && (
        <p role="status" className="mt-4 text-sm">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
