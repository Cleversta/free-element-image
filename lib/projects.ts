import { restoreScene, serializeScene } from "./scene.ts";
import type { Asset, Background, Scene } from "./scene.ts";

export const MAX_PROJECT_FILE_BYTES = 25 * 1024 * 1024;
export type SavedProject = {
  id: string;
  name: string;
  scene: string;
  updatedAt: number;
  thumbnail?: Blob;
};

export function projectName(value: string) {
  return value.trim().slice(0, 80) || "Untitled scene";
}

export function exportProject(name: string, scene: Scene) {
  const raw = JSON.stringify({
    format: "freelement-project",
    version: 1,
    name: projectName(name),
    scene: JSON.parse(serializeScene(scene)),
  });
  if (new Blob([raw]).size > MAX_PROJECT_FILE_BYTES)
    throw new Error(
      "This project is larger than 25 MB. Remove some uploaded photos before exporting a project file.",
    );
  return raw;
}

export function importProject(
  raw: string,
  catalog: Asset[],
  backgrounds: Background[],
) {
  if (new Blob([raw]).size > MAX_PROJECT_FILE_BYTES)
    throw new Error("Project files must be 25 MB or smaller.");
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Choose a valid Freelement project file.");
  }
  if (
    !data ||
    data.format !== "freelement-project" ||
    data.version !== 1 ||
    typeof data.name !== "string"
  ) {
    throw new Error("Choose a valid Freelement project file.");
  }
  try {
    return {
      name: projectName(data.name),
      scene: restoreScene(JSON.stringify(data.scene), catalog, backgrounds),
    };
  } catch {
    throw new Error(
      "This project contains invalid or unsupported scene data. Your current scene has not changed.",
    );
  }
}

async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("freelement-projects", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("projects", { keyPath: "id" });
    let blocked = false;
    request.onsuccess = () => {
      if (blocked) request.result.close();
      else resolve(request.result);
    };
    request.onerror = () =>
      reject(new Error("Browser project storage is unavailable."));
    request.onblocked = () => {
      blocked = true;
      reject(new Error("Close other editor tabs and try again."));
    };
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction("projects", mode);
    let request: IDBRequest<T>;
    try {
      request = action(tx.objectStore("projects"));
    } catch {
      tx.abort();
      db.close();
      reject(
        new Error(
          "Could not save projects. Browser storage may be full or unavailable.",
        ),
      );
      return;
    }
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onabort = () => {
      db.close();
      reject(
        new Error(
          "Could not save projects. Browser storage may be full or unavailable.",
        ),
      );
    };
    tx.onerror = () => {
      /* The abort handler reports transaction failure. */
    };
  });
}

export async function listProjects() {
  const projects = await transaction<SavedProject[]>("readonly", (store) =>
    store.getAll(),
  );
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}
export async function putProject(project: SavedProject) {
  await transaction("readwrite", (store) => store.put(project));
}
export async function getProject(id: string) {
  return transaction<SavedProject | undefined>("readonly", (store) =>
    store.get(id),
  );
}
export async function deleteProject(id: string) {
  await transaction("readwrite", (store) => store.delete(id));
}
