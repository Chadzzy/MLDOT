import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let html = await readFile(path.join(root, "dist/index.html"), "utf8");
const script = html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const css = html.match(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/);
if (!script || !css)
  throw new Error(
    "Expected one built JavaScript bundle and stylesheet. Run npm run build first.",
  );
let js = await readFile(
  path.join(root, "dist", script[1].replace(/^\//, "")),
  "utf8",
);
const stylesheet = await readFile(
  path.join(root, "dist", css[1].replace(/^\//, "")),
  "utf8",
);
for (const name of await readdir(path.join(root, "public/images"))) {
  if (!name.endsWith(".svg")) continue;
  const bytes = await readFile(path.join(root, "public/images", name));
  js = js.replaceAll(
    `/images/${name}`,
    `data:image/svg+xml;base64,${bytes.toString("base64")}`,
  );
}
html = html.replace(
  script[0],
  () =>
    `<script type="module">${js.replaceAll("</script", "<\\/script")}</script>`,
);
html = html.replace(css[0], () => `<style>${stylesheet}</style>`);
await mkdir(path.join(root, "deliverables"), { recursive: true });
await writeFile(path.join(root, "deliverables/journey-demo.html"), html);
await writeFile(path.join(root, "deliverables/journey-walkthrough.html"), html);
console.log(
  "Created deliverables/journey-demo.html (self-contained; no external assets).",
);
