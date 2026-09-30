// Inventory evidence without treating an embedded license claim as verified.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const assets = JSON.parse(await readFile("data/assets.json", "utf8"));
const scenes = JSON.parse(
  await readFile("data/scene-backgrounds.json", "utf8"),
);
const simpleBackgrounds = JSON.parse(await readFile("data/simple-backgrounds.json", "utf8"));
const rights = JSON.parse(
  await readFile("data/publishing-rights.json", "utf8"),
);
const sources = [...new Set([...assets, ...scenes, ...simpleBackgrounds].map((asset) => asset.src))];
const inventory = [];
for (const src of sources) {
  const bytes = await readFile(`public${src}`);
  const svg = bytes.toString();
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const entry = rights[src];
  inventory.push({
    src,
    sha256,
    creatorClaims: [
      ...svg.matchAll(/<dc:creator\b[^>]*>([\s\S]*?)<\/dc:creator\s*>/g),
    ].map((m) => m[1].replace(/<[^>]*>/g, "").trim()),
    sourceClaims: [
      ...svg.matchAll(/<dc:source\b[^>]*>([\s\S]*?)<\/dc:source\s*>/g),
    ].map((m) => m[1].trim()),
    licenseClaims: [
      ...svg.matchAll(/<cc:license\b[^>]*rdf:resource=["']([^"']+)["']/g),
    ].map((m) => m[1]),
    projectSharingEvidence: entry?.sha256 === sha256 ? entry.evidence : null,
    review:
      entry?.sha256 === sha256
        ? "Project display/download evidence recorded; no broader reuse license asserted"
        : "Owner must verify source, creator, permission and attribution before broader reuse",
  });
}
await writeFile(
  "docs/ARTWORK_REVIEW.json",
  JSON.stringify(
    {
      note: "Source and license claims are extracted metadata, not independent permission verification.",
      assets: inventory,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Inventoried ${inventory.length} files; ${inventory.filter((x) => x.projectSharingEvidence).length} have matching project sharing evidence.`,
);
