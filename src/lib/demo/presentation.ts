import type { Issue } from "@/schemas/issue";
import { mapExamplePhoto } from "./map-issues";
// No generated evidence is substituted for a private or missing live photo.
export function issuePhoto(issue: Issue) { return mapExamplePhoto(issue.id) || issue.imageUrl || "/images/photo-private.svg"; }
export function displayTitle(issue: Issue) { return issue.report.title; }
