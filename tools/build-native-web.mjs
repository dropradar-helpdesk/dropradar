import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.resolve(root, "native-www");

function assertInsideRoot(targetPath) {
  const relative = path.relative(root, targetPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside project root: ${targetPath}`);
  }
}

function copyFile(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(outDir, relativePath);
  if (!fs.existsSync(source)) throw new Error(`Missing native web asset: ${relativePath}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDir(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(outDir, relativePath);
  if (!fs.existsSync(source)) throw new Error(`Missing native web directory: ${relativePath}`);
  fs.cpSync(source, target, { recursive: true });
}

assertInsideRoot(outDir);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of [
  "index.html",
  "legal.html",
  "privacy.html",
  "accessibility.html",
  "offline.html",
  "manifest.webmanifest",
  "sw.js"
]) {
  copyFile(file);
}

for (const dir of ["icons", "data"]) copyDir(dir);

const localOnlyConfig = path.join(outDir, "data", "app-config.json");
if (fs.existsSync(localOnlyConfig)) fs.rmSync(localOnlyConfig, { force: true });

console.log(`Built native web bundle: ${path.relative(root, outDir).replace(/\\/g, "/")}`);
