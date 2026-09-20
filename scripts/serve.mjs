import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve("out");
const portIndex = process.argv.indexOf("--port");
const port = Number(
  portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 3000,
);
const host = process.env.HOST || "127.0.0.1";
if (!existsSync(resolve(root, "index.html"))) {
  console.error("Build the site first with npm run build.");
  process.exit(1);
}
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
const server = createServer(async (request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const path = resolve(root, "." + pathname);
    if (path !== root && !path.startsWith(root + sep)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    let file;
    for (const candidate of [
      path,
      path + ".html",
      resolve(path, "index.html"),
    ]) {
      if (
        await stat(candidate)
          .then((value) => value.isFile())
          .catch(() => false)
      ) {
        file = candidate;
        break;
      }
    }
    const status = file ? 200 : 404;
    file ||= resolve(root, "404.html");
    const details = await stat(file);
    response.writeHead(status, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Content-Length": details.size,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") response.end();
    else
      createReadStream(file)
        .on("error", () => response.destroy())
        .pipe(response);
  } catch {
    response.writeHead(400);
    response.end("Bad request");
  }
});
server.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
server.listen(port, host, () =>
  console.log(`Freelement Images: http://${host}:${port}`),
);
