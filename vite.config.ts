import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { compileContent } from "./scripts/content";
export default defineConfig({
  base: "./",
  plugins: [
    vue(),
    {
      name: "course-content",
      async buildStart() {
        await compileContent();
      },
      configureServer(server) {
        server.watcher.add("content/lessons");
        let queue = Promise.resolve();
        server.watcher.on("all", (_event, path) => {
          if (
            !path.replace(/\\/g, "/").includes("content/lessons/") ||
            !path.endsWith(".md")
          )
            return;
          queue = queue
            .then(async () => {
              await compileContent();
              server.ws.send({ type: "full-reload" });
            })
            .catch((error) =>
              server.ws.send({
                type: "error",
                err: { message: String(error), stack: "" },
              }),
            );
        });
      },
    },
  ],
});
