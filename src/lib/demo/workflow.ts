import { localId } from "@/lib/client/id";
import type { PrototypeSubmission, WorkflowStage } from "@/schemas/prototype";
import type { IssueLocation, IssueType } from "@/schemas/issue";

export const stageLabels: Record<WorkflowStage, string> = {
  analyzing: "Analyzing photo",
  routing: "Finding the right authority",
  preparing: "Preparing government form",
  awaiting_review: "Ready for your review",
  sending: "Sending demo report",
  submitted: "Submitted · demo",
  paused: "Paused by you",
  needs_help: "Your help is needed",
  tracking: "Checking for updates",
  resolved: "Resolved · demo",
};
export type WorkflowAction =
  | { type: "pause" }
  | { type: "retry"; reason: string }
  | { type: "takeover" }
  | { type: "resume"; reason: string }
  | { type: "approve"; title: string; description: string }
  | { type: "track" }
  | { type: "auto"; enabled: boolean };
const active: WorkflowStage[] = [
  "analyzing",
  "routing",
  "preparing",
  "sending",
  "tracking",
];
export function isActive(stage: WorkflowStage) {
  return active.includes(stage);
}
export function createSubmission(
  photo: string,
  description: string,
  location: IssueLocation,
  now = Date.now(),
): PrototypeSubmission {
  const type: IssueType = "pothole";
  return {
    id: localId(),
    mode: "demo",
    title: "New neighborhood report",
    type,
    photo,
    description,
    location,
    report: {
      title: "Road surface issue",
      description:
        description ||
        "A road surface issue was reported at the selected location. Please inspect the attached photo.",
      category: type,
    },
    stage: "analyzing",
    resumeStage: null,
    stageStartedAt: now,
    simulatedGovernmentStatus: "not_submitted",
    approved: false,
    receipt: null,
    checks: 0,
    lastCheckedAt: null,
    autoTrack: true,
    trackingInterval: 30000,
    createdAt: now,
    correction: "",
    events: [
      {
        at: now,
        text: "Photo received on this device. Demo workflow started; no AI service was called.",
      },
    ],
  };
}
function transition(
  item: PrototypeSubmission,
  stage: WorkflowStage,
  text: string,
  now: number,
) {
  return {
    ...item,
    stage,
    stageStartedAt: now,
    events: [...item.events, { at: now, text }].slice(-60),
  };
}
export function advanceSubmission(
  item: PrototypeSubmission,
  now: number,
): PrototypeSubmission {
  if (
    item.stage === "submitted" &&
    item.autoTrack &&
    item.lastCheckedAt !== null &&
    now - item.lastCheckedAt >= item.trackingInterval
  ) {
    return transition(
      item,
      "tracking",
      "Scheduled demo status check started while the app is open.",
      now,
    );
  }
  const elapsed = now - item.stageStartedAt;
  if (elapsed < 3500) return item;
  if (item.stage === "analyzing")
    return {
      ...transition(
        item,
        "routing",
        "Sample photo analysis complete. This prototype uses a fixed road-issue scenario, not image recognition.",
        now,
      ),
      title: "Road surface issue",
    };
  if (item.stage === "routing")
    return transition(
      item,
      "preparing",
      "Selected Mountain View's example reporting flow for this demo. Jurisdiction is unverified.",
      now,
    );
  if (item.stage === "preparing")
    return transition(
      item,
      "awaiting_review",
      "Example form filled. Waiting for your approval before simulated sending.",
      now,
    );
  if (item.stage === "sending" && item.approved)
    return {
      ...transition(
        item,
        "submitted",
        "Demo submission completed. No government agency was contacted.",
        now,
      ),
      simulatedGovernmentStatus: "submitted",
      receipt: `DEMO-${item.id.slice(0, 8).toUpperCase()}`,
      lastCheckedAt: now,
    };
  if (item.stage === "tracking") {
    const checks = item.checks + 1;
    const resolved = checks >= 2;
    return {
      ...transition(
        item,
        resolved ? "resolved" : "submitted",
        resolved
          ? "Demo update: marked resolved. This is a scripted outcome, not a verified repair."
          : "Demo update: in progress. No external website was checked.",
        now,
      ),
      checks,
      lastCheckedAt: now,
      simulatedGovernmentStatus: resolved ? "resolved" : "in_progress",
    };
  }
  return item;
}
export function actOnSubmission(
  item: PrototypeSubmission,
  action: WorkflowAction,
  now = Date.now(),
): PrototypeSubmission {
  if (action.type === "auto") return { ...item, autoTrack: action.enabled };
  if (action.type === "pause" && isActive(item.stage))
    return {
      ...transition(item, "paused", "You paused the demo workflow.", now),
      resumeStage: item.stage,
    };
  if (
    action.type === "takeover" &&
    ["paused", "awaiting_review", "preparing"].includes(item.stage)
  )
    return {
      ...transition(
        item,
        "needs_help",
        "You opened the local manual-intervention simulator. No live browser session is connected.",
        now,
      ),
      resumeStage: "preparing",
    };
  if (
    (action.type === "retry" || action.type === "resume") &&
    ["paused", "needs_help", "awaiting_review"].includes(item.stage) &&
    action.reason.trim()
  ) {
    const next = item.resumeStage === "tracking" ? "tracking" : "preparing";
    return {
      ...transition(
        item,
        next,
        `Correction recorded: ${action.reason.trim()}. ${next === "tracking" ? "Retrying the demo check." : "Preparing the example form again; approval will be required again."}`,
        now,
      ),
      correction: action.reason.trim(),
      approved: false,
      resumeStage: null,
    };
  }
  if (
    action.type === "approve" &&
    item.stage === "awaiting_review" &&
    action.title.trim() &&
    action.description.trim()
  )
    return {
      ...transition(
        item,
        "sending",
        "You reviewed the report and approved simulated sending.",
        now,
      ),
      approved: true,
      title: action.title.trim(),
      report: {
        ...item.report,
        title: action.title.trim(),
        description: action.description.trim(),
      },
    };
  if (action.type === "track" && ["submitted", "resolved"].includes(item.stage))
    return transition(
      item,
      "tracking",
      "You requested a demo status check.",
      now,
    );
  return item;
}
