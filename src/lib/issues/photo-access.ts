import type { IssueRow } from "./mapping";
export function visiblePhotoPath(row: Pick<IssueRow, "image_path" | "photo_public" | "owner_id">, viewerId?: string): string | null {
  return row.photo_public === true || (viewerId && row.owner_id === viewerId) ? row.image_path : null;
}
