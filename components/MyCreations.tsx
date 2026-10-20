"use client";

import { useEffect, useRef, useState } from "react";
import ProjectPreview from "./ProjectPreview";
import assets from "@/data/assets.json";
import { savedBackgrounds } from "@/lib/backgrounds";
import { projectThumbnail } from "@/lib/project-thumbnail";
import { restoreScene, serializeScene, type Scene } from "@/lib/scene";
import {
  deleteProject,
  exportProject,
  importProject,
  listProjects,
  MAX_PROJECT_FILE_BYTES,
  projectName,
  putProject,
  type SavedProject,
} from "@/lib/projects";

function download(name: string, scene: Scene) {
  const blob = new Blob([exportProject(name, scene)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${projectName(name).replace(/[^a-z0-9-]+/gi, "-") || "scene"}.freelement.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function MyCreations({
  scene,
  onOpen,
  onClose,
  activeProject,
  onSaved,
}: {
  scene: Scene;
  onOpen: (scene: Scene, name: string, id: string) => void;
  onClose: () => void;
  activeProject: { id: string; name: string } | null;
  onSaved: (project: { id: string; name: string } | null) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [name, setName] = useState(activeProject?.name || "My village");
  const [savedId, setSavedId] = useState(activeProject?.id);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [rename, setRename] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  useEffect(() => {
    dialog.current?.showModal();
    let alive = true;
    listProjects()
      .then((value) => {
        if (alive) setProjects(value);
      })
      .catch(() => {
        if (alive)
          setMessage(
            "Could not read saved scenes. You can still download a backup below.",
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  const run = async (action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not complete this action. Your current scene is still open.",
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const refresh = async () => setProjects(await listProjects());
  const save = (existing?: SavedProject, newCopy = false) =>
    run(async () => {
      const raw = serializeScene(scene);
      const target =
        existing ||
        (!newCopy
          ? projects.find((project) => project.id === savedId) ||
            projects.find(
              (project) =>
                project.name === projectName(name) && project.scene === raw,
            )
          : undefined);
      const id = target?.id || crypto.randomUUID();
      const savedName = projectName(existing?.name || name);
      await putProject({
        id,
        name: savedName,
        scene: raw,
        updatedAt: Date.now(),
        thumbnail: await projectThumbnail(scene),
      });
      setSavedId(id);
      onSaved({ id, name: savedName });
      await refresh();
      setConfirm(null);
      setMessage("Scene saved. You can open it below.");
    });
  const open = (project: SavedProject) =>
    run(async () => {
      onOpen(
        restoreScene(project.scene, assets, savedBackgrounds),
        project.name,
        project.id,
      );
      onClose();
    });
  const importFile = (file?: File) =>
    run(async () => {
      if (!file) return;
      if (file.size > MAX_PROJECT_FILE_BYTES)
        throw new Error("Project files must be 25 MB or smaller.");
      const imported = importProject(
        await file.text(),
        assets,
        savedBackgrounds,
      );
      await putProject({
        id: crypto.randomUUID(),
        name: imported.name,
        scene: serializeScene(imported.scene),
        updatedAt: Date.now(),
        thumbnail: await projectThumbnail(imported.scene),
      });
      await refresh();
      setMessage("Backup added to saved scenes. Choose Open scene to edit it.");
    });
  return (
    <dialog
      ref={dialog}
      className="creationsDialog"
      aria-labelledby="creations-title"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
    >
      <div className="creationsHeading">
        <h2 id="creations-title">My creations</h2>
        <button
          disabled={busy}
          onClick={onClose}
          aria-label="Close My creations"
        >
          Close
        </button>
      </div>
      <p className="creationsIntro">
        Keep your favorite scenes and open them again. No account needed.
      </p>
      <section
        className="projectSaveSection"
        aria-labelledby="save-scene-title"
      >
        <h3 id="save-scene-title">Save the scene you’re editing</h3>
        <p>
          {savedId
            ? "Saves your changes to the same scene."
            : "Save once to add your scene. Saving again updates it."}
        </p>
        <form
          className="projectSave"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label>
            Scene name
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
              disabled={busy}
            />
          </label>
          <button className="primary" disabled={busy || loading}>
            Save this scene
          </button>
          {savedId && (
            <button
              type="button"
              disabled={busy || loading}
              onClick={() => void save(undefined, true)}
            >
              Save a new copy
            </button>
          )}
        </form>
      </section>
      <p role="status" aria-live="polite">
        {busy ? "Working…" : loading ? "Loading saved scenes…" : message}
      </p>
      <h3 className="savedScenesTitle">
        Saved scenes{projects.length > 0 ? ` (${projects.length})` : ""}
      </h3>
      {!loading && !projects.length && (
        <div className="projectEmpty">
          <p>No saved scenes yet.</p>
          <p>Give your scene a name above, then choose Save this scene.</p>
        </div>
      )}
      <div className="projectGrid">
        {projects.map((project) => (
          <article key={project.id} className="projectCard">
            <ProjectPreview blob={project.thumbnail} />
            <h3>{project.name}</h3>
            <p>Saved {new Date(project.updatedAt).toLocaleString()}</p>
            <div className="projectActions">
              <button
                className="primary"
                disabled={busy}
                onClick={() => void open(project)}
              >
                Open scene
              </button>
              <details className="projectMore">
                <summary>More options</summary>
                <div className="projectMoreActions">
                  <button
                    disabled={busy}
                    onClick={() => {
                      setRenaming(project.id);
                      setRename(project.name);
                      setConfirm(null);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await putProject({
                          ...project,
                          id: crypto.randomUUID(),
                          name: projectName(`${project.name} copy`),
                          updatedAt: Date.now(),
                        });
                        await refresh();
                        setMessage("Scene copied.");
                      })
                    }
                  >
                    Duplicate
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        download(
                          project.name,
                          restoreScene(project.scene, assets, savedBackgrounds),
                        );
                        setMessage("Backup downloaded.");
                      })
                    }
                  >
                    Download backup
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      setConfirm(`replace-${project.id}`);
                      setRenaming(null);
                    }}
                  >
                    Update with this scene
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      setConfirm(`delete-${project.id}`);
                      setRenaming(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </details>
            </div>
            {renaming === project.id && (
              <form
                className="projectRename"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(async () => {
                    await putProject({
                      ...project,
                      name: projectName(rename),
                      updatedAt: Date.now(),
                    });
                    await refresh();
                    if (project.id === savedId) {
                      setName(projectName(rename));
                      onSaved({ id: project.id, name: projectName(rename) });
                    }
                    setRenaming(null);
                    setMessage("Scene renamed.");
                  });
                }}
              >
                <label>
                  New scene name
                  <input
                    autoFocus
                    required
                    maxLength={80}
                    value={rename}
                    onChange={(event) => setRename(event.target.value)}
                    disabled={busy}
                  />
                </label>
                <button disabled={busy}>Save name</button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRenaming(null)}
                >
                  Cancel
                </button>
              </form>
            )}
            {confirm === `replace-${project.id}` && (
              <div className="projectConfirm">
                <p>
                  Replace “{project.name}” with the scene currently in the
                  editor?
                </p>
                <button disabled={busy} onClick={() => void save(project)}>
                  Confirm update
                </button>
                <button disabled={busy} onClick={() => setConfirm(null)}>
                  Cancel
                </button>
              </div>
            )}
            {confirm === `delete-${project.id}` && (
              <div className="projectConfirm">
                <p>
                  Delete “{project.name}” from this browser? Download a backup
                  first if you want a backup.
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await deleteProject(project.id);
                      if (project.id === savedId) {
                        setSavedId(undefined);
                        onSaved(null);
                      }
                      await refresh();
                      setConfirm(null);
                      setMessage(
                        "Saved scene deleted. Your scene in the editor stays open.",
                      );
                    })
                  }
                >
                  Confirm delete
                </button>
                <button disabled={busy} onClick={() => setConfirm(null)}>
                  Cancel
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      <details className="projectBackup">
        <summary>Back up or move scenes</summary>
        <p>
          Download an editable backup to keep a copy or use another device. To
          restore one, choose Open backup file. For a PNG image, use Download in
          the editor.
        </p>
        <div className="projectBackupActions">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                download(name, scene);
                setMessage("Backup downloaded.");
              })
            }
          >
            Download current scene backup
          </button>
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => fileInput.current?.click()}
          >
            Open backup file
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,.freelement.json,application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void importFile(file);
            }}
          />
        </div>
      </details>
      <p className="projectStorageNote">
        Saved only in this browser. Clearing browser data removes saved scenes,
        so keep a backup of anything important.
      </p>
    </dialog>
  );
}
