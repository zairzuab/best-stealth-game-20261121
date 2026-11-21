// The Cinder Library — entry program (Node 22, standard library only).
//
// The game lives in game/ as plain static files a desktop browser opens
// offline: index.html plus its ES modules, no library, no network request.
// This program hands it in: it copies game/ and screenshots/ from beside
// this file into the output directory and writes dossier.json, the summary
// the judge reads, with the vendored make.fun library.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });

const shotsDir = join(outDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), shotsDir, { recursive: true });
}

// The scorer's caps, as the kit's gate states them: the dossier text is
// capped at 160 KiB, at most 4 screenshots of 256 KiB each, and game/ holds
// at most 993 files and directories totalling 48 MiB, every path under
// 1000 bytes. Anything over a cap is refused before the judge sees it.
// The run is deterministic: the same repository always writes the same
// bytes to /output, so the grader's two runs agree byte for byte.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
