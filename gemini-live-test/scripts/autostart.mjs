import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin') throw new Error('Autostart requires macOS launchd.');
const action = process.argv[2];
if (!['install', 'prepare', 'status', 'stop'].includes(action)) throw new Error('Use install, prepare, status or stop.');
const root = fileURLToPath(new URL('../', import.meta.url));
const agents = join(homedir(), 'Library', 'LaunchAgents');
const logs = join(homedir(), 'Library', 'Logs', 'Daynize');
const domain = `gui/${process.getuid()}`;
const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const services = [
    {
        label: 'kr.co.daynize.relay', script: join(root, 'server.js'), env: {
            PUBLIC_ORIGIN: 'https://daynize-relay-api.fly.dev',
            ALLOWED_ORIGINS: 'https://www.daynize.co.kr,https://daynize.co.kr',
            NEXT_PUBLIC_WS_URL: 'wss://daynize-relay-api.fly.dev/ws/gemini-live'
        }
    },
    { label: 'kr.co.daynize.tunnel', script: join(root, 'scripts', 'start-tunnel.mjs'), env: {} }
];

if (['install', 'prepare'].includes(action)) {
    if (!existsSync(join(root, '.env'))) throw new Error('Private relay .env is missing.');
    if (!existsSync(join(root, '.tools', 'cloudflared'))) throw new Error('Bundled cloudflared is missing.');
    mkdirSync(agents, { recursive: true });
    mkdirSync(logs, { recursive: true, mode: 0o700 });
    for (const service of services) {
        const environment = { PATH: `${process.execPath.slice(0, process.execPath.lastIndexOf('/'))}:/usr/bin:/bin:/usr/sbin:/sbin`, ...service.env };
        const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${service.label}</string>
<key>ProgramArguments</key><array><string>${xml(process.execPath)}</string><string>${xml(service.script)}</string></array>
<key>WorkingDirectory</key><string>${xml(root)}</string>
<key>EnvironmentVariables</key><dict>${Object.entries(environment).map(([key, value]) => `<key>${xml(key)}</key><string>${xml(value)}</string>`).join('')}</dict>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><true/>
<key>ThrottleInterval</key><integer>10</integer>
<key>ExitTimeOut</key><integer>20</integer>
<key>StandardOutPath</key><string>${xml(join(logs, `${service.label}.out.log`))}</string>
<key>StandardErrorPath</key><string>${xml(join(logs, `${service.label}.err.log`))}</string>
</dict></plist>
`;
        const path = join(agents, `${service.label}.plist`);
        writeFileSync(path, content, { mode: 0o600 });
        execFileSync('/usr/bin/plutil', ['-lint', path], { stdio: 'inherit' });
        if (action === 'prepare') continue;
        spawnSync('/bin/launchctl', ['bootout', `${domain}/${service.label}`], { stdio: 'ignore' });
        execFileSync('/bin/launchctl', ['enable', `${domain}/${service.label}`]);
        execFileSync('/bin/launchctl', ['bootstrap', domain, path], { stdio: 'inherit' });
        console.log(`Installed ${service.label}: starts at login and restarts on exit.`);
    }
} else {
    for (const service of services) {
        if (action === 'stop') {
            spawnSync('/bin/launchctl', ['bootout', `${domain}/${service.label}`], { stdio: 'ignore' });
            execFileSync('/bin/launchctl', ['disable', `${domain}/${service.label}`]);
            console.log(`Stopped and disabled ${service.label}; reinstall to enable.`);
        } else {
            const result = spawnSync('/bin/launchctl', ['print', `${domain}/${service.label}`], { encoding: 'utf8' });
            const state = result.stdout?.match(/^\s*state = (.+)$/m)?.[1];
            const pid = result.stdout?.match(/^\s*pid = (\d+)$/m)?.[1];
            console.log(JSON.stringify({ service: service.label, loaded: result.status === 0, state, pid }));
        }
    }
}