"use client";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, ChevronRight, X } from "lucide-react";
import { ReportedStatus } from "@/components/prototype/common";
import { IssueMarkerIcon } from "@/components/ui/streetwise-icons";
import type { Issue, IssueLocation } from "@/schemas/issue";
import { issuePhoto } from "@/lib/demo/presentation";
export type MapProps = {
  active?: boolean;
  userLocation?: IssueLocation | null;
  issues: Issue[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  origin: IssueLocation;
  recenter: number;
  onUserMove?: () => void;
  selectedDistance: string;
};
export function IssuePin({
  issue,
  selected,
  onSelect,
}: {
  issue: Issue;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`issue-pin ${selected ? "selected" : ""}`}
      aria-label={`Preview ${issue.report.title}${issue.status === "resolved" ? " — Resolved" : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <IssueMarkerIcon type={issue.type} selected={selected} />
      {issue.status === "resolved" && <CheckCircle2 className="resolved-pin-badge" size={19} fill="white" color="#25664c" aria-hidden="true" />}
    </button>
  );
}
export function PinPreview({
  issue,
  distance,
  onClose,
}: {
  issue: Issue;
  distance: string;
  onClose: () => void;
}) {
  return (
    <div className="pin-preview">
      <Link href={`/issues/${issue.id}`}>
        <Image src={issuePhoto(issue)} width={58} height={58} unoptimized alt={issue.report.title} />
        <div>
          <strong>{issue.report.title}</strong>
          <span>{distance}</span>
          <ReportedStatus issue={issue} />
        </div>
        <ChevronRight size={17} className="preview-chevron" />
      </Link>
      <button
        aria-label="Close issue preview"
        className="preview-close"
        onClick={onClose}
      >
        <X size={15} />
      </button>
    </div>
  );
}
