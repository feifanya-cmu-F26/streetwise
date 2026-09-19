export function parseEmailReturn(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) return { kind: "session" as const, accessToken, refreshToken };
  if (params.has("error") || params.has("error_code") || accessToken || refreshToken)
    return { kind: "error" as const };
  return null;
}
