"use client";
import Image from "next/image";
import { useState } from "react";
import { PageHeader, ReportedStatus } from "@/components/prototype/common";
import { isMapExample } from "@/lib/demo/map-issues";
import { issuePhoto } from "@/lib/demo/presentation";
import { useLive, request, SignIn } from "@/components/live/provider";
import { LocationPreview } from "@/components/map/location-preview";
export function IssuePage({ id }: { id: string }) {
  const { issues, user, ready, refresh } = useLive();
  const issue = issues.find((i) => i.id === id);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function confirm(kind: string) {
    setBusy(true);
    setError("");
    try {
      await request(`/api/issues/${id}/confirm`, { kind });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="content-page">
      <PageHeader title="Issue details" />
      <div className="page-body">
        {!issue ? (
          <p>{ready ? "Issue not found." : "Loading…"}</p>
        ) : (
          <>
            <h2>{issue.report.title}</h2>
            <ReportedStatus issue={issue} />
            {(issue.imageUrl || isMapExample(issue)) && <Image className="detail-photo" src={issuePhoto(issue)} width={800} height={600} unoptimized alt={issue.report.title} />}
            <p>{issue.report.description}</p>
            <LocationPreview
              location={issue.location}
              label={issue.location.address || "Issue location"}
            />
            {!isMapExample(issue) && <section className="section-block">
              <h3>Have you seen this?</h3>
              {user ? (
                <div className="action-row">
                  <button
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => confirm("still_there")}
                  >
                    Still there · {issue.community.stillThere}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => confirm("resolved")}
                  >
                    Looks resolved · {issue.community.resolved}
                  </button>
                </div>
              ) : (
                <SignIn />
              )}
              {error && <p role="alert">{error}</p>}
            </section>}
            <section className="section-block">
              <h3>Government request</h3>
              <p>{issue.submission.status.replaceAll("_", " ")}</p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
