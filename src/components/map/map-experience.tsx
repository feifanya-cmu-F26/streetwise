"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IssueMap } from "./issue-map";
import { IssueDetail } from "@/components/issue/issue-detail";
import { apiFetch } from "@/lib/api/client";
import { issueTypeLabels } from "@/lib/issues/labels";
import { issuesResponseSchema } from "@/schemas/api";
import type { Issue } from "@/schemas/issue";

export function MapExperience({ initialIssueId }: { initialIssueId?: string }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialIssueId ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const detailPanelRef = useRef<HTMLElement>(null);
  const revealDetailRef = useRef(false);
  const load = useCallback(
    (signal?: AbortSignal) =>
      apiFetch("/api/issues", issuesResponseSchema, { signal })
        .then(({ data }) => {
          if (signal?.aborted) return;
          setIssues(data);
          setError("");
        })
        .catch((error: unknown) => {
          if (signal?.aborted) return;
          setError(
            error instanceof Error ? error.message : "Could not load issues.",
          );
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        }),
    [],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const selected = issues.find((issue) => issue.id === selectedId);
  const selectIssue = useCallback((id: string) => {
    revealDetailRef.current = true;
    setSelectedId(id);
  }, []);
  useEffect(() => {
    if (!selected || !revealDetailRef.current) return;
    revealDetailRef.current = false;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;

    const frame = window.requestAnimationFrame(() => {
      const panel = detailPanelRef.current;
      if (!panel) return;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      panel.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
      panel.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selected]);
  return (
    <main id="main" className="mx-auto max-w-[1600px] p-5 sm:p-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Your neighborhood, together
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Small reports. Better streets.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Explore sample issues around Mountain View.
          </p>
        </div>
        <Button asChild>
          <Link href="/report">
            <Plus size={18} aria-hidden="true" />
            Try a demo report
          </Link>
        </Button>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <IssueMap
          issues={issues}
          selectedId={selectedId}
          onSelect={selectIssue}
        />
        <aside
          ref={detailPanelRef}
          tabIndex={selected ? -1 : undefined}
          className="overflow-hidden rounded-xl border border-border bg-white"
          aria-label={selected ? "Issue details" : "Neighborhood issues"}
        >
          {loading ? (
            <p role="status" className="p-6">
              Loading sample issues…
            </p>
          ) : error ? (
            <div className="p-6">
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setLoading(true);
                  void load();
                }}
              >
                Try again
              </Button>
            </div>
          ) : selected ? (
            <IssueDetail
              key={selected.id}
              issue={selected}
              onBack={() => setSelectedId(null)}
              onUpdate={(next) =>
                setIssues((current) =>
                  current.map((issue) => (issue.id === next.id ? next : issue)),
                )
              }
            />
          ) : (
            <>
              <div className="border-b border-border p-5">
                <h2 className="font-semibold">
                  Sample issues{" "}
                  <span className="ml-1 text-muted-foreground">
                    {issues.length}
                  </span>
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select an issue to explore the details.
                </p>
              </div>
              {selectedId && (
                <p role="status" className="px-5 pt-4 text-sm">
                  That demo issue is no longer available. Select another below.
                </p>
              )}
              {issues.length === 0 && (
                <p className="p-5 text-sm">
                  No sample issues yet. Try creating a demo report.
                </p>
              )}
              <ul>
                {issues.map((issue) => (
                  <li
                    key={issue.id}
                    className="border-b border-border last:border-0"
                  >
                    <button
                      onClick={() => selectIssue(issue.id)}
                      className="w-full p-5 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <span className="flex justify-between gap-4">
                        <span className="text-xs text-muted-foreground">
                          {issueTypeLabels[issue.type]}
                        </span>
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </span>
                      <span className="mt-2 block font-semibold leading-6">
                        {issue.report.title}
                      </span>
                      <span className="mt-2 block text-xs text-muted-foreground">
                        {issue.community.stillThere} still there ·{" "}
                        {issue.submission.status.replaceAll("_", " ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
