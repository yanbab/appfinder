import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const svgPath = path.join(ROOT_DIR, 'src/renderer/assets/sf-symbols/arrow.trianglehead.2.clockwise.rotate.90.svg');
let svg = fs.readFileSync(svgPath, 'utf8');
// Clean up for template image (solid black paths)
svg = svg.replace('stroke="currentColor"', 'stroke="#000000"');

const outDir = path.join(ROOT_DIR, 'data/tray');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function main() {
  // macOS menubar icon: 16x16 @1x, 32x32 @2x
  await sharp(Buffer.from(svg))
    .resize(16, 16)
    .png()
    .toFile(path.join(outDir, 'trayTemplate.png'));

  await sharp(Buffer.from(svg))
    .resize(32, 32)
    .png()
    .toFile(path.join(outDir, 'trayTemplate@2x.png'));

  console.log('Tray template icons successfully generated at data/tray/');
}

main().catch((err) => {
  console.error('Failed to generate tray icons:', err);
  process.exit(1);
});
