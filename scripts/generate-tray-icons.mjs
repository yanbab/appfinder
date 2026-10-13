import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export const TRAY_TEMPLATE_SVG = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Row 1 -->
  <rect x="4" y="4" width="6.8" height="6.8" rx="1.6" fill="#000000" fill-opacity="0.25"/>
  <rect x="12.6" y="4" width="6.8" height="6.8" rx="1.6" fill="#000000"/>
  <rect x="21.2" y="4" width="6.8" height="6.8" rx="1.6" fill="#000000" fill-opacity="0.25"/>

  <!-- Row 2 -->
  <rect x="4" y="12.6" width="6.8" height="6.8" rx="1.6" fill="#000000"/>
  <rect x="12.6" y="12.6" width="6.8" height="6.8" rx="1.6" fill="#000000"/>
  <rect x="21.2" y="12.6" width="6.8" height="6.8" rx="1.6" fill="#000000"/>

  <!-- Row 3 -->
  <rect x="4" y="21.2" width="6.8" height="6.8" rx="1.6" fill="#000000" fill-opacity="0.25"/>
  <rect x="12.6" y="21.2" width="6.8" height="6.8" rx="1.6" fill="#000000"/>
  <rect x="21.2" y="21.2" width="6.8" height="6.8" rx="1.6" fill="#000000" fill-opacity="0.25"/>
</svg>`;

const outDir = path.join(ROOT_DIR, 'data/tray');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function main() {
  // Save source SVG
  fs.writeFileSync(path.join(outDir, 'trayTemplate.svg'), TRAY_TEMPLATE_SVG, 'utf8');

  const svgBuffer = Buffer.from(TRAY_TEMPLATE_SVG);

  // macOS menubar icon: 16x16 @1x, 32x32 @2x
  await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toFile(path.join(outDir, 'trayTemplate.png'));

  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(outDir, 'trayTemplate@2x.png'));

  console.log('AppFinder 3x3 tray template icons successfully generated at data/tray/');
}

main().catch((err) => {
  console.error('Failed to generate tray icons:', err);
  process.exit(1);
});
