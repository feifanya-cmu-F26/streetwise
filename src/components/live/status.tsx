"use client";
import {
  LoaderCircle,
  CheckCircle2,
  PauseCircle,
  Clock3,
  AlertCircle,
} from "lucide-react";
import type { LiveReport } from "@/schemas/live";
const labels: Record<string, string> = {
  queued_analysis: "Queued",
  analyzing: "Analyzing photo",
  review: "Review needed",
  queued_prepare: "Preparing",
  preparing: "Preparing form",
  ready: "Ready to send",
  paused: "Paused",
  needs_input: "Your help needed",
  queued_submit: "Sending",
  submitting: "Sending",
  uncertain: "Check submission",
  submitted: "Submitted",
  queued_track: "Checking status",
  tracking: "Checking status",
  queued_verify: "Checking receipt",
  verifying: "Checking receipt",
  failed: "Needs attention",
};
export function LiveStatus({ report }: { report: LiveReport }) {
  const active =
    /^queued_|^(analyzing|preparing|submitting|tracking|verifying)$/.test(
      report.stage,
    );
  const Icon = active
    ? LoaderCircle
    : report.receipt?.status === "resolved"
      ? CheckCircle2
      : report.stage === "failed" || report.stage === "uncertain"
        ? AlertCircle
        : ["paused", "needs_input", "review", "ready"].includes(report.stage)
          ? PauseCircle
          : Clock3;
  return (
    <span className="stage-status">
      <Icon size={18} className={active ? "spin" : ""} />
      {report.stage === "submitted"
        ? report.receipt?.status?.replaceAll("_", " ") || "Submitted"
        : labels[report.stage]}
    </span>
  );
}
