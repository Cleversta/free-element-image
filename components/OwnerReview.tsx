"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type Entry = {
  reports?: { id: string; reason: string }[];
  id: string;
  slug: string;
  title: string;
  description: string;
  status: string;
};
export default function OwnerReview() {
  const [signedIn, setSignedIn] = useState(false);
  const [key, setKey] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rights, setRights] = useState<Record<string, boolean>>({});
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  async function load(queue = status, number = page) {
    const response = await fetch(
      `/api/admin/review?status=${queue}&page=${number}`,
      { cache: "no-store" },
    );
    const data = await response.json();
    if (response.status === 401) setSignedIn(false);
    if (!response.ok)
      throw new Error(data.error || "Unable to load submissions.");
    setEntries(data.images);
    setMore(data.more);
    setRights({});
    setRejectId(null);
  }
  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((r) => {
        if (r.ok) setSignedIn(true);
      })
      .catch(() => setError("Could not reach the server."));
  }, []);
  useEffect(() => {
    if (!signedIn) return;
    setBusy(true);
    setError("");
    load(status, page)
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
    // load receives the queue and page explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, status, page]);
  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setKey("");
      setSignedIn(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }
  async function review(
    entry: Entry,
    action: "approve" | "reject" | "withdraw" | "dismiss",
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entry.id,
          action,
          rightsConfirmed: rights[entry.id] === true,
          reportIds: entry.reports?.map((report) => report.id) || [],
        }),
        signal: AbortSignal.timeout(90000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Review failed.");
      setWithdrawId(null);
      setNotice(
        action === "withdraw"
          ? data.cleanupPending
            ? "Image hidden. Storage cleanup will retry through the recovery command."
            : "Image removed from the public gallery."
          : action === "dismiss"
            ? "Reports dismissed. The image remains public."
            : action === "approve"
              ? `Published “${entry.title}”. Its page is now in the gallery.`
              : `Rejected “${entry.title}”. It remains private.`,
      );
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Review failed. Refresh the queue before retrying.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setSignedIn(false);
      setEntries([]);
      setNotice("");
    } catch {
      setError("Could not sign out. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="galleryPage">
      <nav>
        <Link href="/">Freelement Images</Link>
        <Link href="/gallery">Public gallery</Link>
      </nav>
      <h1>Owner review</h1>
      {!signedIn ? (
        <form className="ownerLogin" onSubmit={login}>
          <p>
            Enter your private owner access key to review submissions. Visitors
            do not need an account.
          </p>
          <label>
            Owner access key
            <input
              type="password"
              required
              autoComplete="current-password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </label>
          <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
      ) : (
        <>
          <div className="publishButtons">
            <label>
              Review queue{" "}
              <select
                disabled={busy}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                  setNotice("");
                }}
              >
                <option value="pending">Pending</option>
                <option value="published">Published</option>
                <option value="reported">Reported</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                load()
                  .catch((e) => setError(e.message))
                  .finally(() => setBusy(false));
              }}
            >
              Refresh queue
            </button>
            <button disabled={busy} onClick={logout}>
              Sign out
            </button>
          </div>
          <p>
            Check the image and its source permissions before approval. Approval
            permits public display and download; it does not label artwork
            public domain or grant a broader reuse license.
          </p>
          {!busy && entries.length === 0 && (
            <p>No submissions in this queue.</p>
          )}
          <div className="reviewGrid">
            {entries.map((entry) => (
              <article className="reviewCard" key={entry.id}>
                <a
                  href={`/api/admin/preview/${entry.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={`/api/admin/preview/${entry.id}`}
                    alt={entry.title}
                    width="1200"
                    height="800"
                  />
                </a>
                <h2>{entry.title}</h2>
                <p>{entry.description}</p>
                {entry.status === "pending" && (
                  <>
                    <label className="publishConsent">
                      <input
                        type="checkbox"
                        checked={!!rights[entry.id]}
                        disabled={busy}
                        onChange={(e) =>
                          setRights({ ...rights, [entry.id]: e.target.checked })
                        }
                      />
                      I verified that the source artwork may be publicly
                      displayed and downloaded.
                    </label>
                    <div className="publishButtons">
                      <button
                        disabled={busy || !rights[entry.id]}
                        onClick={() => review(entry, "approve")}
                      >
                        Approve and publish
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => setRejectId(entry.id)}
                      >
                        Reject
                      </button>
                    </div>
                    {rejectId === entry.id && (
                      <div>
                        <p>
                          Reject this submission? The creator will see its
                          rejected status.
                        </p>
                        <button
                          disabled={busy}
                          onClick={() => review(entry, "reject")}
                        >
                          Confirm rejection
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => setRejectId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </>
                )}
                {entry.reports && (
                  <p>
                    {entry.reports.length} report(s):{" "}
                    {[
                      ...new Set(entry.reports.map((report) => report.reason)),
                    ].join(", ")}
                  </p>
                )}
                {entry.reports && (
                  <button
                    disabled={busy}
                    onClick={() => review(entry, "dismiss")}
                  >
                    Dismiss these reports
                  </button>
                )}
                {entry.status === "published" && (
                  <div>
                    <button
                      disabled={busy}
                      onClick={() => setWithdrawId(entry.id)}
                    >
                      Remove public image
                    </button>
                    {withdrawId === entry.id && (
                      <div>
                        <p>Remove this image from the public gallery?</p>
                        <button
                          disabled={busy}
                          onClick={() => review(entry, "withdraw")}
                        >
                          Confirm removal
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => setWithdrawId(null)}
                        >
                          Keep published
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {entry.status === "published" && (
                  <Link href={`/images/${entry.slug}`}>View public page →</Link>
                )}
              </article>
            ))}
          </div>
          <div className="publishButtons">
            <button
              disabled={busy || page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button disabled={busy || !more} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </>
      )}
      {busy && <p role="status">Working…</p>}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
