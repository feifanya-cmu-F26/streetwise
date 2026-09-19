import { apiRoute, demoResponse } from "@/lib/api/route";
import { assertSameOrigin, requireUser, limit } from "@/lib/auth/server";
import { authorityIdSchema } from "@/schemas/live";
import { forgetGovernmentLogin, closeGovernmentLogin } from "@/lib/submission/connections";
export async function DELETE(request: Request, context: { params: Promise<{ authority: string }> }) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const authority = authorityIdSchema.parse((await context.params).authority);
    await limit(`government-login:${user.id}`, 20, 3600);
    await forgetGovernmentLogin(user.id, authority);
    return demoResponse({ cleared: true }, 200, "live");
  });
}

export async function POST(request: Request, context: { params: Promise<{ authority: string }> }) {
  return apiRoute(async () => {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const authority = authorityIdSchema.parse((await context.params).authority);
    await limit(`government-login:${user.id}`, 20, 3600);
    await closeGovernmentLogin(user.id, authority, false);
    return demoResponse({ saved: true }, 200, "live");
  });
}
