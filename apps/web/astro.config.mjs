import { fileURLToPath } from "node:url";

import { defineConfig } from "astro/config";

const pages = process.env.GITHUB_PAGES === "1";
const version = process.env.APP_VERSION ?? process.env.npm_package_version ?? "0.0.0";

export default defineConfig({
  site: pages ? "https://adarkmaker.github.io" : "http://localhost:4321",
  base: pages ? "/keMeow" : "/",
  output: "static",
  compressHTML: true,
  devToolbar: { enabled: false },
  vite: {
    define: {
      "import.meta.env.PUBLIC_APP_VERSION": JSON.stringify(version),
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
