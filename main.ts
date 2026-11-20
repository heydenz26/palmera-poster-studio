// Palmera Poster Studio — make.fun gta6-cover-art-01 entry program.
// Node 22, standard library only, TypeScript-erasable like the vendored library.
// It validates the hand-in before anything reaches /output: every screenshot is
// really a PNG or a JPEG (read from its leading magic bytes, not just its name),
// the app/ tree stays under the platform's file and byte caps, and the dossier
// stays under its own byte cap. Then it copies app/ + screenshots/ in and writes
// /output/dossier.json with the byte-for-byte vendored buildDossier.
// Local runs:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Scorer caps, mirrored from the kit's gate (competition.yaml). Keeping these
// here lets a bad build fail loudly in this program, not later on the server.
const CAPS = {
  screenshotsMax: 4,
  screenshotMaxBytes: 262144,
  appMaxFiles: 993,
  appMaxBytes: 50331648,
  appPathMaxBytes: 1000,
  dossierMaxBytes: 1572864, // 1.5 MiB (competition.yaml: "the dossier at most 1.5 MiB")
  dossierTextMaxBytes: 163840, // 160 KiB, the dossier's text cap (text_max_bytes)
};

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

/** Human size string for a byte count, e.g. "48 MiB". */
function humanSize(bytes) {
  return `${(bytes / 1048576).toFixed(1)} MiB`;
}

/** Returns { kind, ext } for a file's leading bytes, or null if it is neither PNG nor JPEG. */
function sniffImage(firstBytes) {
  const b = firstBytes;
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    return { kind: 'PNG', ext: '.png' };
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { kind: 'JPEG', ext: '.jpg' };
  }
  return null;
}

/** Recursively totals the files under a directory and checks the path-length cap. */
function countFiles(dir, basePath) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = join(basePath, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      const sub = countFiles(p, rel);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += st.size;
      const pathBytes = Buffer.byteLength(rel, 'utf8');
      if (pathBytes > CAPS.appPathMaxBytes) {
        fail(`app/${rel}: a path of ${pathBytes} UTF-8 bytes, over the ${CAPS.appPathMaxBytes}-byte limit (app_path_max_bytes)`);
      }
    }
  }
  return { files, bytes };
}

mkdirSync(outDir, { recursive: true });

// Validate the screenshots before copying: 3 or 4, each a whole PNG or JPEG file
// under the cap. The magic-byte check catches a .jpg that is really something else.
const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) fail('screenshots/ is missing');
const shots = readdirSync(shotsDir).filter((n) => !n.startsWith('.')).sort();
if (shots.length < 3 || shots.length > CAPS.screenshotsMax) {
  fail(`screenshots/: expected ${3} to ${CAPS.screenshotsMax} files, found ${shots.length} (screenshots.max)`);
}
for (const name of shots) {
  const shotPath = join(shotsDir, name);
  const size = statSync(shotPath).size;
  if (size > CAPS.screenshotMaxBytes) {
    fail(`screenshot ${name}: ${size} bytes, over the ${humanSize(CAPS.screenshotMaxBytes)} limit (screenshots.max_bytes)`);
  }
  const head = readFileSync(shotPath).subarray(0, 12);
  const sniff = sniffImage(head);
  if (!sniff) {
    fail(`screenshot ${name} is not a real PNG or JPEG (magic bytes: ${[...head.subarray(0, 4)].map((b) => b.toString(16).padStart(2, '0')).join(' ')})`);
  }
}

// Validate app/ size before copying it in.
const appStats = countFiles(join(here, 'app'), 'app');
if (appStats.files > CAPS.appMaxFiles) {
  fail(`app/: holds ${appStats.files} files and directories, over the ${CAPS.appMaxFiles} limit (app_max_files)`);
}
if (appStats.bytes > CAPS.appMaxBytes) {
  fail(`app/: its files come to ${appStats.bytes} bytes, over the ${humanSize(CAPS.appMaxBytes)} limit (app_max_bytes)`);
}

cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: CAPS.dossierTextMaxBytes,
  screenshots: { max: CAPS.screenshotsMax, max_bytes: CAPS.screenshotMaxBytes },
  app_max_files: CAPS.appMaxFiles,
  app_max_bytes: CAPS.appMaxBytes,
  app_path_max_bytes: CAPS.appPathMaxBytes,
});
if (dossier.length > CAPS.dossierMaxBytes) {
  fail(`dossier.json: would be ${dossier.length} bytes, over the ${humanSize(CAPS.dossierMaxBytes)} limit (the 1.5 MiB dossier cap)`);
}
writeFileSync(join(outDir, 'dossier.json'), dossier);

const dossierMiB = (dossier.length / 1048576).toFixed(2);
const dossierPct = ((dossier.length / CAPS.dossierMaxBytes) * 100).toFixed(1);
console.log(`main.ts: wrote dossier.json (${dossierMiB} MiB / ${dossier.length} bytes, ${dossierPct}% of the 1.5 MiB cap) for ${shots.length} screenshots and ${appStats.files} app files -> ${outDir}`);
console.log(`  screenshots: ${shots.join(', ')}`);
const shotBytes = shots.reduce((sum, n) => sum + statSync(join(shotsDir, n)).size, 0);
const totalMiB = ((appStats.bytes + shotBytes + dossier.length) / 1048576).toFixed(2);
console.log(`  build size: app ${(appStats.bytes / 1048576).toFixed(2)} MiB + screenshots ${(shotBytes / 1048576).toFixed(2)} MiB + dossier ${dossierMiB} MiB = ${totalMiB} MiB total`);

// Post-write integrity round: re-read what we just copied so a partial copy,
// a truncated dossier, or a missing app file fails here instead of at hand-in.
const dossierPath = join(outDir, 'dossier.json');
const reread = readFileSync(dossierPath);
if (reread.length !== dossier.length || reread.compare(Buffer.from(dossier, 'utf8')) !== 0) {
  fail(`dossier.json: written copy (${reread.length} bytes) differs from the source dossier (${dossier.length} bytes)`);
}
try {
  JSON.parse(reread.toString('utf8'));
} catch {
  fail('dossier.json: written file is not valid JSON');
}
const copiedApp = countFiles(join(outDir, 'app'), 'app');
if (copiedApp.files !== appStats.files || copiedApp.bytes !== appStats.bytes) {
  fail(`app/: copied tree holds ${copiedApp.files} files / ${copiedApp.bytes} bytes, expected ${appStats.files} / ${appStats.bytes}`);
}
const copiedShots = readdirSync(join(outDir, 'screenshots')).filter((n) => !n.startsWith('.')).length;
if (copiedShots !== shots.length) {
  fail(`screenshots/: copied ${copiedShots} files, expected ${shots.length}`);
}

console.log(`  verified: dossier.json parses as JSON and matches, app/ file count and size match, ${shots.length} screenshots copied`);
console.log(`  OK — dossier at ${dossierPct}% of its ${humanSize(CAPS.dossierMaxBytes)} cap at ${dossierPath}; ready to hand in.`);
