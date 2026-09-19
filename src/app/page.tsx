import { MapExperience } from "@/components/map/map-experience";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ issue?: string }>;
}) {
  const { issue } = await searchParams;
  return <MapExperience initialIssueId={issue} />;
}
