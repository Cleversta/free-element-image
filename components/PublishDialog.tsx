"use client";
import { useEffect, useRef, useState } from "react";
import { sceneCategories } from "@/lib/gallery-filters";
import Script from "next/script";
import type { Scene } from "@/lib/scene";
import blockedArtwork from "@/data/publishing-compatibility.json";
import { serializeScene } from "@/lib/scene";

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

export default function PublishDialog({
  scene,
  onClose,
}: {
  scene: Scene;
  onClose: () => void;
}) {
  const blocked = scene.items
    .filter((item) => item.asset.src in blockedArtwork)
    .map((item) => item.asset.variant.replace(/-/g, " "));
  const dialog = useRef<HTMLDialogElement>(null);
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const token = useRef("");
  const [settings, setSettings] = useState<{
    enabled: boolean;
    siteKey: string | null;
  } | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [challenge, setChallenge] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("nature");
  const [description, setDescription] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [publicSlug, setPublicSlug] = useState("");
  const [managementLink, setManagementLink] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    token.current = Array.from(
      crypto.getRandomValues(new Uint8Array(32)),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    const controller = new AbortController();
    fetch("/api/publish", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setSettings(await response.json());
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Could not check publishing availability. Close this window and try again.",
          );
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (
      !scriptReady ||
      !settings?.siteKey ||
      !widget.current ||
      !window.turnstile
    )
      return;
    widgetId.current = window.turnstile.render(widget.current, {
      sitekey: settings.siteKey,
      action: "publish",
      callback: (value: string) => {
        setChallenge(value);
      },
      "expired-callback": () => setChallenge(""),
      "error-callback": () => {
        setChallenge("");
        setError(
          "Verification could not load. Check your connection and try again.",
        );
      },
    });
    return () => {
      if (widgetId.current && window.turnstile)
        window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [scriptReady, settings]);
  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (busyRef.current || !challenge || !consent || blocked.length > 0) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const editableScene = serializeScene(scene);
      if (new Blob([editableScene]).size > 3 * 1024 * 1024)
        throw new Error(
          "This scene is too large to publish. Remove some uploaded photos and try again. You can still save or download it.",
        );
      const link = `${location.origin}/manage#${token.current}`;
      setManagementLink(link);
      // Keep a receipt even if the connection drops after the server accepted the image.
      try {
        localStorage.setItem("freelement-last-submission", link);
      } catch {
        /* The visible link remains available. */
      }
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          consent,
          managementToken: token.current,
          challenge,
          scene: editableScene,
        }),
        signal: AbortSignal.timeout(90000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ||
            "Submission failed. Check your private link before retrying.",
        );
      setPublicSlug(
        result.status === "published"
          ? result.slug || `scene-${result.id}`
          : "",
      );
      setSubmitted(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Submission failed. Please try again.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
      setChallenge("");
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="publishDialog"
      aria-labelledby="publish-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busyRef.current) onClose();
      }}
    >
      <div className="publishHeading">
        <h2 id="publish-title">
          {submitted
            ? publicSlug
              ? "Your scene is published"
              : "Submitted for review"
            : "Share your scene"}
        </h2>
        <button
          type="button"
          aria-label="Close publishing"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {submitted ? (
        <p>
          {publicSlug
            ? "Your scene is now public. You can remove it using your private management link."
            : "Your image is stored privately while it awaits review. It is not public yet. No account is needed."}
          {publicSlug && (
            <a href={`/images/${publicSlug}`}>View public image →</a>
          )}
        </p>
      ) : (
        <>
          <p>
            Submit a scene for public display, download, and editing. Every
            scene is reviewed before publication. Editing and downloading are
            always free.
          </p>
          {settings?.enabled === false && (
            <p role="status">
              Publishing is not available yet. You can still save and download
              your scene.
            </p>
          )}
          {!settings && !error && <p>Checking availability…</p>}
          {settings?.enabled && (
            <form onSubmit={publish}>
              <label>
                Image title
                <input
                  autoComplete="off"
                  minLength={3}
                  maxLength={120}
                  placeholder="e.g. A quiet village beside the lake"
                  required
                  value={title}
                  disabled={busy}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                Category
                <select
                  aria-label="Category"
                  value={category}
                  disabled={busy}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {sceneCategories.map((c) => (
                    <option key={c} value={c}>
                      {c[0].toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Description (optional)
                <textarea
                  maxLength={1000}
                  value={description}
                  disabled={busy}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label className="publishConsent">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  disabled={busy}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  I have permission to share any photos and agree to public
                  display, download, and editing of a copy of this scene after
                  owner approval.
                </span>
              </label>
              <p className="usageNote">
                Publishing is limited to protect the service. Keep this window
                open if you need to retry. Saving and downloading remain
                available.
              </p>
              <div ref={widget} />
              <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                onReady={() => setScriptReady(true)}
                onError={() =>
                  setError(
                    "Verification could not load. Check your connection and try again.",
                  )
                }
              />
              <button
                className="publishPrimary"
                type="submit"
                disabled={busy || !challenge || !consent || blocked.length > 0}
              >
                {busy ? "Submitting…" : "Submit for review"}
              </button>
            </form>
          )}
        </>
      )}
      {blocked.length > 0 && (
        <p role="alert">
          To publish this scene, first remove or replace:{" "}
          {[...new Set(blocked)].join(", ")}. These elements can still be used
          for local downloads.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {managementLink && (
        <section className="managementReceipt">
          <h3>Keep your private management link</h3>
          <p>
            Anyone with this link can check or remove this submission. Save it
            before closing.
          </p>
          <input
            aria-label="Private management link"
            readOnly
            value={managementLink}
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="publishButtons">
            <a href={managementLink} target="_blank" rel="noreferrer">
              Manage submission
            </a>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(managementLink);
                  setCopyNotice("Link copied.");
                } catch {
                  setCopyNotice("Select the link above and copy it manually.");
                }
              }}
            >
              Copy private link
            </button>
          </div>
          {copyNotice && <p role="status">{copyNotice}</p>}
        </section>
      )}
    </dialog>
  );
}
