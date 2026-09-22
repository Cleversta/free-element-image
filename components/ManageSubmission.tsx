"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Receipt = { title: string; status: string };
const statusText: Record<string, string> = {
  uploading: "Your image is still processing. Refresh its status in a moment.",
  pending: "Your image is private and waiting for review.",
  published: "Your image has been published.",
  rejected:
    "This submission was not accepted or its upload could not finish. You can remove it and submit a new scene.",
  deleting: "Removal is in progress. Retry removal if it has not finished.",
  deleted:
    "Your image files have been removed. A private deletion record is retained.",
};
export default function ManageSubmission() {
  const [token, setToken] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    const value = location.hash.slice(1);
    if (/^[a-f0-9]{64}$/.test(value)) setToken(value);
    else
      setError(
        "Open the full private link you received after submitting your scene.",
      );
  }, []);
  async function request(
    action: "status" | "delete",
    value = token,
    signal?: AbortSignal,
  ) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/submissions/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managementToken: value, action }),
        signal: signal || AbortSignal.timeout(90000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not load this submission.");
      setReceipt(result);
      setConfirm(false);
    } catch (reason) {
      if (!signal?.aborted)
        setError(
          reason instanceof Error ? reason.message : "Please try again.",
        );
    } finally {
      if (!signal?.aborted) setBusy(false);
    }
  }
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void request("status", token, controller.signal);
    return () => controller.abort();
    // The request uses the explicit token captured for this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  return (
    <main className="managePage">
      <Link href="/create">← Back to the editor</Link>
      <h1>Manage your submission</h1>
      <p>
        This page is private. Keep its link to check the status or remove your
        image without an account.
      </p>
      {receipt && (
        <section>
          <h2>{receipt.title}</h2>
          <p role="status">
            {statusText[receipt.status] || "Status unavailable."}
          </p>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
      {token && (
        <div className="publishButtons">
          <button disabled={busy} onClick={() => request("status")}>
            {busy ? "Please wait…" : "Refresh status"}
          </button>
          {receipt && receipt.status !== "deleted" && (
            <button disabled={busy} onClick={() => setConfirm(true)}>
              Remove submission
            </button>
          )}
        </div>
      )}
      {confirm && (
        <section>
          <p>Remove this image from storage? This cannot be undone.</p>
          <div className="publishButtons">
            <button disabled={busy} onClick={() => request("delete")}>
              Yes, remove image
            </button>
            <button disabled={busy} onClick={() => setConfirm(false)}>
              Keep image
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
