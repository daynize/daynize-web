import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const episodes = JSON.parse(readFileSync(join(root, 'src/data/pop-culture-episodes.json'), 'utf8'));
const selectedIds = process.argv.slice(2);
const output = join(root, 'audio/pop-culture');
const temporary = mkdtempSync(join(tmpdir(), 'daynize-pop-audio-'));
mkdirSync(output, { recursive: true });

try {
    for (const episode of episodes.filter((item) => !selectedIds.length || selectedIds.includes(item.id))) {
        for (const [index, sentence] of episode.practice.entries()) {
            const name = `${episode.id}-${index + 1}`;
            const source = join(temporary, `${name}.aiff`);
            execFileSync('/usr/bin/say', ['-v', 'Samantha', '-r', '135', '-o', source, sentence.en]);
            execFileSync('/usr/bin/afconvert', ['-f', 'm4af', '-d', 'aac', source, join(output, `${name}.m4a`)]);
            console.log(`Generated ${name}.m4a`);
        }
    }
} finally {
    rmSync(temporary, { recursive: true, force: true });
}