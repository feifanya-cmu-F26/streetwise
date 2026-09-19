import { IssuePage } from "@/components/issue/issue-page";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IssuePage id={id} />;
}
