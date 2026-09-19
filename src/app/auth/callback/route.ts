import { emailAuthClient } from "@/lib/auth/pkce";
import { saveSession } from "@/lib/auth/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const flowId = url.searchParams.get("sb_flow_id");
  if (code) {
    const client = await emailAuthClient(request);
    const { data, error } = await client.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    if (!error && data.session) {
      await saveSession(data.session, request);
      return NextResponse.redirect(new URL("/submissions", request.url));
    }
  }
  return NextResponse.redirect(new URL("/report?signin=expired", request.url));
}
