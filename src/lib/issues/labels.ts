import type { IssueType } from "@/schemas/issue";

export const issueTypeLabels: Record<IssueType, string> = {
  pothole: "Pothole",
  street_light: "Street light",
  trash: "Litter & dumping",
  sidewalk: "Sidewalk",
  water_leak: "Water leak",
};
