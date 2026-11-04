// Production files mounted at a repository subpath, deliberately no SPA rewrite.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve("dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
};
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/DailyEnglish/")) {
      res.writeHead(404).end();
      return;
    }
    const suffix = decodeURIComponent(
      url.pathname.slice("/DailyEnglish/".length),
    );
    const file = resolve(root, suffix || "index.html");
    if (!file.startsWith(root + "/") && !file.startsWith(root + "\\")) {
      res.writeHead(403).end();
      return;
    }
    const body = await readFile(file);
    res
      .writeHead(200, {
        "content-type": types[extname(file)] ?? "application/octet-stream",
      })
      .end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(4173, "127.0.0.1");
