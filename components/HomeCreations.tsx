"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ProjectPreview from "./ProjectPreview";
import { listProjects, type SavedProject } from "@/lib/projects";

export default function HomeCreations() {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      listProjects()
        .then((value) => {
          if (alive) {
            setProjects(value);
            setError(false);
          }
        })
        .catch(() => {
          if (alive) setError(true);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      alive = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);
  return (
    <section
      id="my-creations"
      className="homeCreations"
      aria-labelledby="my-creations-title"
    >
      <div className="homeGalleryHeading">
        <div>
          <h2 id="my-creations-title">My creations</h2>
          <p>
            Your saved scenes, right here in this browser. No account needed.
          </p>
        </div>
        <Link href="/create?creations=1">Manage saved scenes →</Link>
      </div>
      {loading ? (
        <p role="status">Loading your saved scenes…</p>
      ) : error ? (
        <p role="status">
          Your saved scenes couldn’t be loaded. Try refreshing this page.
        </p>
      ) : projects.length ? (
        <div className="projectGrid">
          {projects.map((project) => (
            <article className="projectCard" key={project.id}>
              <Link
                className="homeProjectLink"
                href={`/create?project=${encodeURIComponent(project.id)}`}
              >
                <ProjectPreview blob={project.thumbnail} />
                <h3>{project.name}</h3>
                <span className="primary">Open scene →</span>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="homeCreationsEmpty">
          <p>
            Your saved scenes will appear here. In the editor, choose My
            creations, then Save this scene.
          </p>
          <Link href="/create">Create your first scene →</Link>
        </div>
      )}
    </section>
  );
}
