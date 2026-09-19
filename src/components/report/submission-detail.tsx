"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Check, MapPin, Monitor, Pause, RefreshCw, X } from "lucide-react";
import { PageHeader } from "@/components/prototype/common";
import { request, useLive, SignIn } from "@/components/live/provider";
import { LiveStatus } from "@/components/live/status";
import {
  liveReportSchema,
  type LiveReport,
  type ReportAction,
} from "@/schemas/live";
import { LocationPreview } from "@/components/map/location-preview";
import { canTakeOver, PORTALS } from "@/lib/submission/portals";
import { automaticAuthority } from "@/lib/submission/authority-choice";
type Detail = {
  report: LiveReport;
  photoUrl: string | null;
  events: { stage: string; message: string; created_at: string }[];
};
export function SubmissionDetail({ id }: { id: string }) {
  const { user, refresh } = useLive();
  const [detail, setDetail] = useState<Detail | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [browser, setBrowser] = useState<{
      url: string | null;
      interactive: boolean;
      sessionId?: string;
    } | null>(null),
    [reason, setReason] = useState(""),
    [loginNotice, setLoginNotice] = useState(""),
    [confirm, setConfirm] = useState(false),
    [takeover, setTakeover] = useState(false);
  const load = useCallback(async () => {
    try {
      const data = await request<Detail>(`/api/reports/${id}`);
      data.report = liveReportSchema.parse(data.report);
      setDetail(data);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    if (!user) return;
    const start = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), 3000);
    return () => {
      clearTimeout(start);
      clearInterval(timer);
    };
  }, [load, user]);
  async function act(action: ReportAction) {
    setError("");
    setBusy(true);
    try {
      await request(`/api/reports/${id}`, action);
      setConfirm(false);
      setTakeover(false);
      await load();
      void refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function manageGovernmentLogin(authority: string, forget: boolean) {
    setBusy(true); setError(""); setLoginNotice("");
    try {
      const response = await fetch(`/api/government-connections/${authority}`, { method: forget ? "DELETE" : "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Could not update this login.");
      setBrowser(null); setLoginNotice(forget ? "Government login cleared." : "Browser closed. Login saved for the next task."); await load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function openBrowser() {
    setBusy(true); setError("");
    try {
      const connection = await request<{ url: string | null; interactive: boolean }>(`/api/reports/${id}/browser`);
      setBrowser({ ...connection, sessionId: detail?.report.session_id || undefined });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const report = detail?.report.owner_id === user?.id ? detail?.report : undefined;
  const visibleBrowser = browser?.sessionId === report?.session_id ? browser : null;
  if (!user)
    return (
      <main className="content-page">
        <PageHeader title="Submission" back="/submissions" />
        <SignIn />
      </main>
    );
  return (
    <main className="content-page submission-detail">
      <PageHeader title="Submission" back="/submissions" />
      <div className="page-body">
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        {!report || !detail ? (
          <p>Loading your report…</p>
        ) : (
          <>
            <header className="submission-overview">
              {detail.photoUrl && <Image src={detail.photoUrl} width={88} height={88} unoptimized alt="Your issue photo" />}
              <div>
                <h2>{report.report?.title || report.analysis?.generatedReport.title || "New issue"}</h2>
                <p><MapPin size={14} aria-hidden="true" /><span>{report.location.address || "Your selected location"}</span></p>
                <time dateTime={report.created_at}>{new Date(report.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time>
              </div>
            </header>
            <SubmissionProgress report={report} />
            <section className="submission-current" aria-label="Current status">
              <div aria-live="polite"><LiveStatus report={report} /></div>
              <p className="submission-next">{nextStep(report)}</p>
              {report.message && <details className="status-explanation"><summary>More details</summary><p>{report.message}</p></details>}
              {["preparing", "queued_prepare", "queued_submit"].includes(report.stage) && (
                <button className="text-button" disabled={busy} onClick={() => act({ action: "pause", reason: "Paused by the user." })}><Pause size={16} />Pause task</button>
              )}
              {report.stage === "failed" && <button className="primary-button" disabled={busy} onClick={() => act({ action: "retry" })}>Retry this step</button>}
              {report.stage === "paused" && <button className="primary-button" disabled={busy || !canTakeOver(report)} onClick={() => act({ action: "resume" })}>Resume task</button>}
              {report.stage === "needs_input" && !report.session_id && <button className="primary-button" disabled={busy || !canTakeOver(report)} onClick={() => act({ action: "resume" })}>Continue preparation</button>}
            </section>
            {report.stage === "review" && <Review key={report.id} report={report} busy={busy} onApprove={act} />}
            {report.session_id && (!report.receipt || report.tracking_supported === false) && (
              <section className="submission-browser" aria-label="Government website">
                <div className="submission-section-heading"><h3><Monitor size={18} />Government website</h3>{visibleBrowser?.url && <button className="icon-button" aria-label="Hide browser preview" onClick={() => { setBrowser(null); setTakeover(false); }}><X size={18} /></button>}</div>
                <p className="small muted">{report.authority_id ? PORTALS[report.authority_id].name : "Official reporting portal"}</p>
                {!visibleBrowser?.url ? (
                  <button className={canTakeOver(report) ? "primary-button" : "secondary-button"} disabled={busy} onClick={openBrowser}>
                    <Monitor size={18} />{busy ? "Connecting…" : canTakeOver(report) ? "Open government website" : "Watch agent work"}
                  </button>
                ) : (
                  <>
                    <div className="browser-controls">
                      {canTakeOver(report) ? <label className="checkbox-row"><input type="checkbox" checked={takeover} onChange={(e) => setTakeover(e.target.checked)} />Take control</label> : <span className="small muted">Live view · agent is working</span>}
                      <button className="icon-button" aria-label="Reconnect browser" disabled={busy} onClick={openBrowser}><RefreshCw size={17} /></button>
                    </div>
                    <iframe title="Official reporting portal" src={visibleBrowser.url} className="live-browser"
                      style={{ pointerEvents: takeover && canTakeOver(report) ? "auto" : "none" }}
                      tabIndex={takeover && canTakeOver(report) ? 0 : -1} sandbox="allow-same-origin allow-scripts" allow="clipboard-read; clipboard-write" />
                    {takeover && canTakeOver(report) && <PortalTextInput id={id} onError={setError} />}
                    {report.stage === "needs_input" && <button className="primary-button" disabled={busy || !canTakeOver(report)} onClick={() => act({ action: "resume" })}>Done · continue preparation</button>}
                    {canTakeOver(report) && !report.receipt && <details className="submission-disclosure"><summary>Already submitted on the website?</summary><p>Check the receipt to avoid sending the same report twice.</p><button className="secondary-button" disabled={busy} onClick={() => act({ action: "verify_receipt" })}>Check receipt</button></details>}
                  </>
                )}
                {report.authority_id === "mountain_view" && report.stage === "needs_input" && !report.receipt && (
                  <details className="submission-disclosure">
                    <summary>Continue without an AskMV account?</summary>
                    <p>Anonymous submissions will not receive replies or status tracking.</p>
                    <button className="secondary-button" disabled={busy || !canTakeOver(report)} onClick={() => act({ action: "portal_mode", mode: "anonymous" })}>Use anonymous submission</button>
                    {report.contact?.portalReplyMode === "anonymous" && <button className="text-button" disabled={busy || !canTakeOver(report)} onClick={() => act({ action: "portal_mode", mode: "account" })}>Use an account for replies instead</button>}
                  </details>
                )}
              </section>
            )}
            {report.stage === "ready" && (
              <section className="submission-send">
                <h3>Ready for your approval</h3>
                <label className="checkbox-row"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />I reviewed the official form. This is a real issue and I authorize sending this report.</label>
                <button className="primary-button" disabled={busy || !confirm} onClick={() => act({ action: "submit", confirmedRealReport: true, confirmedReviewedForm: true })}>Submit to {report.authority_id ? PORTALS[report.authority_id].name : "authority"}</button>
              </section>
            )}
            {report.receipt && (
              <section className="submission-receipt">
                <h3>Government request</h3>
                <div className="receipt-reference"><span>Reference</span><strong>{report.receipt.id}</strong></div>
                <p className="receipt-status">{report.receipt.status.replaceAll("_", " ")}</p>
                {report.contact?.portalReplyMode === "anonymous" ? <p className="small muted">Submitted anonymously · replies and tracking are off.</p> : <>
                  {report.stage === "submitted" && <button className="secondary-button" disabled={busy} onClick={() => act({ action: "track" })}><RefreshCw size={16} />Check status</button>}
                  {report.last_tracked_at && <p className="small muted">Last checked {new Date(report.last_tracked_at).toLocaleString()}</p>}
                </>}
              </section>
            )}
            <div className="submission-extras">
              {["preparing", "queued_prepare", "ready", "needs_input", "queued_submit"].includes(report.stage) && (
                <details className="submission-disclosure">
                  <summary>Correct this task</summary>
                  <label>What needs changing?<textarea placeholder="Wrong website, incorrect location…" value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} /></label>
                  <button className="secondary-button" disabled={busy || !reason.trim()} onClick={() => act({ action: "pause", reason })}>Save correction &amp; pause</button>
                </details>
              )}
              <details className="submission-disclosure">
                <summary>Report &amp; location</summary>
                {detail.photoUrl && <Image className="detail-photo" src={detail.photoUrl} width={800} height={600} unoptimized alt="Your evidence photo" />}
                <p>{report.report?.description || report.description}</p>
                <LocationPreview location={report.location} label={report.location.address || "Issue location"} />
              </details>
              <details className="submission-disclosure">
                <summary>Activity <span className="disclosure-count">{detail.events.length}</span></summary>
                <ol className="activity-list">{detail.events.map((event, i) => <li key={`${event.created_at}-${i}`}><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time><p>{event.message}</p></li>)}</ol>
              </details>
              {report.authority_id && report.contact?.portalReplyMode !== "anonymous" && (
                <details className="submission-disclosure">
                  <summary>Saved government login</summary>
                  <p className="small muted">Your login is private and reused for this agency. You may need to sign in again when it expires.</p>
                  <button className="secondary-button" disabled={busy} onClick={() => manageGovernmentLogin(report.authority_id!, false)}>Save login &amp; close browser</button>
                  <button className="text-button" disabled={busy} onClick={() => manageGovernmentLogin(report.authority_id!, true)}>Clear saved login</button>
                  {loginNotice && <p role="status">{loginNotice}</p>}
                </details>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
function nextStep(report: LiveReport): string {
  if (report.receipt && report.stage === "submitted") return report.contact?.portalReplyMode === "anonymous" ? "Your report has been sent. Replies and tracking are off." : report.receipt.status === "resolved" ? "The agency has marked your request as resolved." : report.tracking_supported === false ? "Open the government website to restore access for tracking." : "Your report is with the agency. You can check for updates here.";
  if (report.stage === "review") return "Check the report below before we prepare the official form.";
  if (report.stage === "needs_input") return "The website needs your help. Open it, complete the missing step, then continue.";
  if (report.stage === "ready") return "Review the official form, then approve sending it.";
  if (report.stage === "paused") return "Your progress is saved. Resume when you’re ready.";
  if (report.stage === "failed") return "This step could not finish. Review the details and try again.";
  if (report.stage === "uncertain") return "We could not confirm whether it was sent. Check the website receipt before trying again.";
  if (["analyzing", "queued_analysis"].includes(report.stage)) return "We’re checking your photo and finding the responsible agency.";
  if (["tracking", "queued_track", "verifying", "queued_verify"].includes(report.stage)) return "We’re checking the government website for an update.";
  if (["submitting", "queued_submit"].includes(report.stage)) return "Sending your approved report. Please don’t submit it again.";
  return "We’re filling the official form. You can watch the agent work below.";
}
function SubmissionProgress({ report }: { report: LiveReport }) {
  const current = report.receipt ? 4 : report.stage === "review" ? 1 : ["ready", "submitting", "queued_submit", "uncertain", "verifying", "queued_verify"].includes(report.stage) ? 3 : report.report ? 2 : report.analysis ? 1 : 0;
  return <ol className="submission-progress" aria-label="Submission progress">{["Analyze", "Review", "Prepare", "Send"].map((label, index) => <li key={label} className={index < current ? "complete" : index === current ? "current" : ""} aria-current={index === current ? "step" : undefined}><span>{index < current ? <Check size={14} aria-hidden="true" /> : index + 1}</span><small>{label}</small><span className="sr-only">{index < current ? " complete" : index === current ? " current step" : " pending"}</span></li>)}</ol>;
}

function PortalTextInput({ id, onError }: { id: string; onError: (message: string) => void }) {
  const [text, setText] = useState("");
  const [secret, setSecret] = useState(false);
  const [sending, setSending] = useState(false);
  return <details className="section-block">
    <summary>Use phone keyboard</summary>
    <p className="small muted">Tap a field inside the browser above, then enter its text here. Streetwise does not save this text.</p>
    <form onSubmit={async (e) => {
      e.preventDefault(); setSending(true); onError("");
      try { await request(`/api/reports/${id}/browser`, { text }); setText(""); }
      catch (error) { onError((error as Error).message); }
      finally { setSending(false); }
    }}>
      <label>Text for selected field<input type={secret ? "password" : "text"} autoComplete="off" value={text} maxLength={4000} required onChange={(e) => setText(e.target.value)} /></label>
      <label className="checkbox-row"><input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} />Hide sensitive text</label>
      <button className="secondary-button" disabled={sending || !text}>{sending ? "Entering…" : "Fill selected field"}</button>
    </form>
  </details>;
}
function Review({
  report,
  busy,
  onApprove,
}: {
  report: LiveReport;
  busy: boolean;
  onApprove: (a: ReportAction) => Promise<void>;
}) {
  const { user } = useLive();
  const suggested = automaticAuthority(report.analysis?.authority);
  const [manual, setManual] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(
      report.analysis?.generatedReport.title || "",
    ),
    [description, setDescription] = useState(
      report.analysis?.generatedReport.description || "",
    ),
    [authority, setAuthority] = useState<
      NonNullable<LiveReport["authority_id"]> | ""
    >(""),
    [email, setEmail] = useState(user?.email || ""),
    [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [checked, setChecked] = useState(false);
  const selectedAuthority = manual || !suggested ? authority : suggested;
  return (
    <form
      className="review-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onApprove({
          action: "approve",
          report: { title, description, category: report.analysis!.issueType },
          ...((manual || !suggested) && authority ? { authorityId: authority, authorityConfirmed: true as const } : {}),
          contact: { email, name, phone },
          duplicatesReviewed: true,
          publishConfirmed: true,
          publishPhotoConfirmed: true,
        });
      }}
    >
      <div className="submission-section-heading"><h3>Review your report</h3><button className="text-button" type="button" aria-expanded={editing} disabled={busy || (editing && (!title.trim() || !description.trim()))} onClick={() => setEditing(!editing)}>{editing ? "Done editing" : "Edit"}</button></div>
      {!editing && <div className="review-copy"><strong>{title}</strong><p>{description}</p></div>}
      <div hidden={!editing}>
      <label>
        Title
        <input
          maxLength={160}
          value={title}
          required
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        Report
        <textarea
          rows={6}
          required
          maxLength={selectedAuthority === "caltrans" ? 500 : 4000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      </div>
      {report.description && <p className="small muted">Your note: {report.description}</p>}
      {suggested && !manual ? (
        <section className="section-block">
          <h3>Submitting to {PORTALS[suggested].name}</h3>
          <p className="small muted">Selected automatically from official road maintenance records.</p>
          <button type="button" className="text-button" onClick={() => { setManual(true); setChecked(false); }}>Change agency</button>
        </section>
      ) : (
      <label>
        {suggested ? "Choose a different agency" : "Agency needs confirmation"}
        <select
          required
          value={authority}
          onChange={(e) => {
            setAuthority(e.target.value as typeof authority);
            setChecked(false);
          }}
        >
          <option value="" disabled>Select responsible agency</option>
          {Object.entries(PORTALS).map(([id, p]) => (
            <option value={id} key={id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      )}
      {manual && suggested && <button type="button" className="text-button" onClick={() => { setManual(false); setChecked(false); }}>Use automatic selection</button>}
      <details className="small muted">
        <summary>{suggested ? "Why this agency?" : "Why we need your help"}</summary>
        <p>{report.analysis?.authority.reason}</p>
      </details>
      {!!report.analysis?.duplicateCandidates.length && (
        <div className="inline-error">
          <strong>Similar nearby reports</strong>
          {report.analysis.duplicateCandidates.map((c) => (
            <p key={c.issueId}>
              <a href={`/issues/${c.issueId}`} target="_blank" rel="noreferrer">
                {c.title}
              </a>{" "}
              · {Math.round(c.distanceMeters)} m
            </p>
          ))}
        </div>
      )}
      <details className="review-contact" open={selectedAuthority === "caltrans" ? true : undefined}><summary>Contact details{selectedAuthority === "caltrans" ? " · email required" : " · optional"}</summary>
      <label>
        Contact email{selectedAuthority === "caltrans" ? "" : " (optional)"}
        <input
          type="email"
          required={selectedAuthority === "caltrans"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Name (optional)
        <input
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Phone (optional)
        <input
          value={phone}
          maxLength={40}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      </details>
      <label className="checkbox-row">
        <input
          type="checkbox"
          required
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        {manual || !suggested ? "I confirm the selected agency and reviewed this report." : "I reviewed this report and its destination."} Publish this issue’s location,
        report text and photo on the map; keep my contact details private.
      </label>
      <button
        className="primary-button"
        disabled={
          busy ||
          !selectedAuthority ||
          !checked ||
          !description.trim() ||
          description.length > (selectedAuthority === "caltrans" ? 500 : 4000)
        }
      >
        Prepare official form
      </button>
    </form>
  );
}
