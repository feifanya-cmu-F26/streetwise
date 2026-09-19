"use client";
import Link from "next/link";

import {
  CircleAlert,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  PauseCircle,
} from "lucide-react";
import { isActive, stageLabels } from "@/lib/demo/workflow";
import type { WorkflowStage } from "@/schemas/prototype";
import type { Issue } from "@/schemas/issue";
import { isMapExample } from "@/lib/demo/map-issues";
export function PageHeader({
  title,
  back = "/",
}: {
  title: string;
  back?: string;
}) {
  return (
    <header className="page-header">
      <Link href={back} aria-label="Go back">
        <ArrowLeft size={23} />
      </Link>
      <h1>{title}</h1>
      <span />
    </header>
  );
}
export function StageStatus({ stage }: { stage: WorkflowStage }) {
  const Icon = isActive(stage)
    ? LoaderCircle
    : stage === "resolved"
      ? CheckCircle2
      : ["paused", "needs_help", "awaiting_review"].includes(stage)
        ? PauseCircle
        : Clock3;
  return (
    <span className={`stage-status ${stage}`}>
      <Icon size={17} className={isActive(stage) ? "spin" : ""} />
      {stageLabels[stage]}
    </span>
  );
}
export function ReportedStatus({ issue }: { issue?: Issue }) {
  const resolved = issue?.status === "resolved";
  return (
    <span className={`reported-status${resolved ? " resolved" : ""}`}>
      {resolved ? <CheckCircle2 size={15} color="#25664c" /> : <CircleAlert size={15} fill="#df8a33" color="white" strokeWidth={2} />}
      {resolved ? "Resolved" : "Reported"}{issue && isMapExample(issue) ? " · Demo" : ""}
    </span>
  );
}
export function DemoNote({ children }: { children?: React.ReactNode }) {
  return (
    <p className="demo-note">
      {children || "Interactive demo. No government reports are sent."}
    </p>
  );
}
