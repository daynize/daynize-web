import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: `${root}.env`, quiet: true });
const token = process.env.TUNNEL_TOKEN || process.env.CLOUDFLARE_TUNNEL_TOKEN;
const config = process.env.CLOUDFLARE_TUNNEL_CONFIG;
if (!token && !config) {
    console.error('Existing named Tunnel credentials are missing. Set TUNNEL_TOKEN in the private .env, or CLOUDFLARE_TUNNEL_CONFIG to an existing config file. Configure its public hostname api.daynize.co.kr -> http://localhost:8080 in Cloudflare.');
    process.exit(1);
}
if (config && !existsSync(config)) {
    console.error('The configured Tunnel file does not exist.');
    process.exit(1);
}
const bundled = `${root}.tools/cloudflared`;
const executable = process.env.CLOUDFLARED_BIN || (existsSync(bundled) ? bundled : 'cloudflared');
const args = config ? ['tunnel', '--config', config, 'run'] : ['tunnel', 'run'];
const child = spawn(executable, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...(token ? { TUNNEL_TOKEN: token } : {}) }
});
child.on('error', () => {
    console.error('Unable to start the existing cloudflared executable.');
    process.exitCode = 1;
});
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));