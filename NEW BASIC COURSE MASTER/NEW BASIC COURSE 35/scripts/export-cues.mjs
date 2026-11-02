// Exports the narration script from src/script.ts (single source of truth) to scripts/cues.json.
// Run from anywhere: node scripts/export-cues.mjs
import {build} from 'esbuild';
import {writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const entry = join(here, '..', 'src', 'script.ts');

const result = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
});

const code = result.outputFiles[0].text;
const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

const cues = mod.CUE_DEFS.map((c) => ({id: c.id, scene: c.scene, kr: c.kr, en: c.en ?? null, say: c.say ?? null}));
writeFileSync(join(here, 'cues.json'), JSON.stringify(cues, null, 2) + '\n', 'utf8');
console.log(`Exported ${cues.length} cues -> scripts/cues.json`);
