"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
export default function ReportImage({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [siteKey, setSiteKey] = useState("");
  const [ready, setReady] = useState(false);
  const [challenge, setChallenge] = useState("");
  const [reason, setReason] = useState("spam");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const element = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch("/api/reports", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.enabled) throw new Error();
        setSiteKey(data.siteKey);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Reporting is temporarily unavailable. Please try again later.",
          );
      });
    return () => controller.abort();
  }, [open]);
  useEffect(() => {
    if (!open || !ready || !siteKey || !element.current || !window.turnstile)
      return;
    widgetId.current = window.turnstile.render(element.current, {
      sitekey: siteKey,
      action: "report",
      callback: (token: string) => setChallenge(token),
      "expired-callback": () => setChallenge(""),
      "error-callback": () => {
        setChallenge("");
        setError("Verification could not load. Please try again.");
      },
    });
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [open, ready, siteKey]);
  async function report(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !challenge) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, reason, challenge }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Report failed.");
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
      setChallenge("");
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    }
  }
  return (
    <section className="reportBox">
      {!open ? (
        <button onClick={() => setOpen(true)}>Report this image</button>
      ) : sent ? (
        <p role="status">Report received. The owner will review it.</p>
      ) : (
        <form onSubmit={report}>
          <h2>Report this image</h2>
          <label>
            Reason{" "}
            <select
              value={reason}
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="spam">Spam or misleading content</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="rights">Artwork permissions concern</option>
              <option value="broken">Broken image</option>
            </select>
          </label>
          <div ref={element} />
          {siteKey && (
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
              onReady={() => setReady(true)}
              onError={() =>
                setError("Verification could not load. Please try again.")
              }
            />
          )}
          <button disabled={busy || !challenge}>
            {busy ? "Sending…" : "Send report"}
          </button>
          {error && <p role="alert">{error}</p>}
        </form>
      )}
    </section>
  );
}
