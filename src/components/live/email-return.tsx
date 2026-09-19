"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { parseEmailReturn } from "@/lib/client/auth-return";
import { request } from "./provider";

export function EmailReturn() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    const result = parseEmailReturn(window.location.hash);
    const expired = new URLSearchParams(window.location.search).get("signin") === "expired";
    if (!result && !expired) return;
    // Remove bearer credentials from the address/history before any async work.
    window.history.replaceState(null, "", window.location.pathname);
    const work = async () => {
      if (result?.kind !== "session") {
        setMessage("This email link is expired or belongs to another browser. Request a new sign-in email.");
        return;
      }
      setMessage("Completing sign-in…");
      try {
        await request("/api/auth", { action: "exchange", accessToken: result.accessToken, refreshToken: result.refreshToken });
        window.location.replace("/submissions");
      } catch (error) {
        setMessage((error as Error).message);
      }
    };
    // Keep processing after Strict Mode's effect cleanup; the URL is already
    // cleared so a second effect cannot exchange the same credentials twice.
    void work();
  }, []);
  return message ? <div className="auth-message" role="status"><span>{message}</span><button aria-label="Dismiss sign-in message" onClick={() => setMessage("")}><X size={18} /></button></div> : null;
}
