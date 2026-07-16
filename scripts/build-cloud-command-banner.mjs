import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outputPath = path.resolve(
  process.argv[2] ?? path.join(root, "docs/assets/cloud-command-banner.png"),
);
const svgOutputPath = outputPath.toLowerCase().endsWith(".png")
  ? outputPath.slice(0, -4) + ".svg"
  : outputPath + ".svg";
const nodeModules = process.argv[3];

if (!nodeModules) {
  throw new Error("Pass the bundled node_modules directory as the second argument.");
}

const require = createRequire(path.join(nodeModules, "package.json"));
const sharp = require("sharp");

const logoPath = path.join(
  root,
  "control-plane/prototype/v-01/assets/img/cloudcommand-mark.svg",
);
const fontPath = path.join(
  root,
  "control-plane/prototype/v-01/assets/fonts/jetbrains-mono/JetBrainsMono-SemiBold.woff2",
);

const [logo, font] = await Promise.all([
  fs.readFile(logoPath),
  fs.readFile(fontPath),
]);

const logoData = logo.toString("base64");
const fontData = font.toString("base64");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="250" viewBox="0 0 800 250" role="img" aria-labelledby="title desc">
  <title id="title">CloudCommand</title>
  <desc id="desc">The white CloudCommand cloud and command-prompt mark followed by the cloud-command executable name in terminal green JetBrains Mono.</desc>
  <defs>
    <style>
      @font-face {
        font-family: "JetBrains Mono";
        src: url("data:font/woff2;base64,${fontData}") format("woff2");
        font-weight: 600;
        font-style: normal;
      }
      .wordmark {
        font-family: "JetBrains Mono", monospace;
        font-size: 58px;
        font-weight: 600;
        letter-spacing: 0.015em;
      }
    </style>
  </defs>

  <rect width="800" height="250" fill="#020711"/>

  <!-- The existing white CloudCommand mark is embedded without modification. -->
  <image href="data:image/svg+xml;base64,${logoData}" x="40" y="15" width="210" height="210"/>

  <!-- Align the wordmark with the terminal prompt's final horizontal stroke. -->
  <text class="wordmark" x="205" y="212" fill="#75e6a8">cloud-command</text>
</svg>`;

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(svgOutputPath, svg);
await sharp(Buffer.from(svg)).png().toFile(outputPath);

process.stdout.write(`${svgOutputPath}\n${outputPath}\n`);
