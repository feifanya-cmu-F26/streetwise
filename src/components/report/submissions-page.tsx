"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/prototype/common";
import { SignIn, useLive, request } from "@/components/live/provider";
import { liveReportSchema, type LiveReport } from "@/schemas/live";
import { LiveStatus } from "@/components/live/status";
export function SubmissionsPage() {
  const { user, refresh } = useLive(),
    path = usePathname();
  const [reports, setReports] = useState<LiveReport[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    if (!user || path !== "/submissions") return;
    let cancelled = false;
    async function load() {
      try {
        const data = liveReportSchema
          .array()
          .parse(await request("/api/reports"));
        if (!cancelled) {
          setReports(data);
          setError("");
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }
    void load();
    const timer = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user, path]);
  return (
    <main className="content-page">
      <PageHeader title="My submissions" />
      {!user ? (
        <SignIn />
      ) : (
        <div className="page-body">
          {error && <p role="alert">{error}</p>}
          {!reports.length && !error && <p>Your reports will appear here.</p>}
          {reports.map((r) => (
            <Link
              key={r.id}
              className="submission-row"
              href={`/submissions/${r.id}`}
            >
              <div>
                <h3>{r.report?.title || "New issue"}</h3>
                <p>
                  {r.location.address ||
                    new Date(r.created_at).toLocaleDateString()}
                </p>
                <LiveStatus report={r} />
              </div>
            </Link>
          ))}
          {user.isAnonymous ? (
            <p className="guest-note">Guest · Reports saved in this browser. Keep browser data to retain access.</p>
          ) : <button
            className="text-button"
            onClick={async () => {
              await request("/api/auth", { action: "logout" });
              setReports([]);
              await refresh();
            }}
          >
            Sign out · {user.email}
          </button>}
        </div>
      )}
    </main>
  );
}
