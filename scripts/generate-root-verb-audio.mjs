import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(root, 'data', 'root-verb-dialogues.json');
const outputDirectory = join(root, 'audio', 'root-verb-dialogues');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'daynize-root-verb-audio-'));
const requestedScenarioIds = process.argv.slice(2).map(Number);
const voices = {
    '지안(프리미엄)': 'Jian (Premium)',
    '민수(고품질)': 'Minsu (Enhanced)',
    Samantha: 'Samantha'
};

const run = (command, args) => execFileSync(command, args, { stdio: 'pipe' });
const formatNumber = (value) => String(value).padStart(2, '0');

try {
    const installedVoices = run('/usr/bin/say', ['-v', '?']).toString('utf8');
    for (const voice of Object.values(voices)) {
        if (!installedVoices.split('\n').some((line) => line.trimStart().startsWith(`${voice} `))) {
            throw new Error(`Required macOS voice is not installed: ${voice}`);
        }
    }

    const scenarios = JSON.parse(readFileSync(dataPath, 'utf8'));
    const selectedScenarios = requestedScenarioIds.length
        ? scenarios.filter((scenario) => requestedScenarioIds.includes(scenario.scenario_id))
        : scenarios;
    if (!selectedScenarios.length || selectedScenarios.length !== new Set(requestedScenarioIds).size && requestedScenarioIds.length) {
        throw new Error(`No matching dialogue scenarios found for: ${requestedScenarioIds.join(', ')}`);
    }
    const totalLines = selectedScenarios.reduce((sum, scenario) => sum + scenario.dialogue_lines.length, 0);
    let completed = 0;
    mkdirSync(outputDirectory, { recursive: true });

    for (const scenario of selectedScenarios) {
        for (const line of scenario.dialogue_lines) {
            const scenarioId = formatNumber(scenario.scenario_id);
            const lineId = formatNumber(line.line_number);
            const baseName = `scenario-${scenarioId}-line-${lineId}`;

            for (const [language, text, voice] of [
                ['ko', line.ko_text, voices[line.ko_voice]],
                ['en', line.en_text, voices[line.en_voice]]
            ]) {
                if (!voice) throw new Error(`No TTS voice mapping for ${line.ko_voice}`);
                const aiffPath = join(temporaryDirectory, `${baseName}-${language}.aiff`);
                const outputPath = join(outputDirectory, `${baseName}-${language}.mp3`);
                run('/usr/bin/say', ['-v', voice, '-o', aiffPath, text]);
                run('/opt/homebrew/bin/ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', aiffPath, '-vn', '-codec:a', 'libmp3lame', '-q:a', '3', outputPath]);
                line[`${language}_audio`] = `audio/root-verb-dialogues/${baseName}-${language}.mp3`;
            }

            completed += 1;
            if (completed % 10 === 0 || completed === totalLines) {
                console.log(`Generated audio for ${completed}/${totalLines} dialogue turns (${completed * 2} files)`);
            }
        }
    }

    const updatedPath = `${dataPath}.tmp`;
    writeFileSync(updatedPath, `${JSON.stringify(scenarios, null, 4)}\n`);
    renameSync(updatedPath, dataPath);
    const selectedPrefixes = new Set(selectedScenarios.map((scenario) => `scenario-${formatNumber(scenario.scenario_id)}-`));
    for (const name of readdirSync(outputDirectory)) {
        if (name.endsWith('.m4a') && [...selectedPrefixes].some((prefix) => name.startsWith(prefix))) {
            unlinkSync(join(outputDirectory, name));
        }
    }
    console.log(`Saved ${completed * 2} audio files in ${outputDirectory}`);
} finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
}