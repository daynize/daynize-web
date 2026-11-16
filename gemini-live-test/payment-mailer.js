const net = require('node:net');
const tls = require('node:tls');
const { spawn } = require('node:child_process');

const CRLF = '\r\n';

function smtpCommand(socket, command, expected = /^[23]/) {
    return new Promise((resolve, reject) => {
        let buffer = '';
        const onData = chunk => {
            buffer += chunk.toString('utf8');
            const lines = buffer.split(CRLF);
            if (lines.length < 2) return;
            const last = lines.at(-2);
            if (!/^\d{3}(?: |$)/.test(last)) return;
            cleanup();
            const code = Number(last.slice(0, 3));
            if (!expected.test(last)) reject(new Error(`SMTP ${code}: ${last.slice(4)}`));
            else resolve(last);
        };
        const onError = error => { cleanup(); reject(error); };
        const cleanup = () => {
            socket.off('data', onData);
            socket.off('error', onError);
        };
        socket.on('data', onData);
        socket.once('error', onError);
        if (command) socket.write(`${command}${CRLF}`);
    });
}

function connect({ host, port, secure, timeoutMs }) {
    return new Promise((resolve, reject) => {
        const socket = secure ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
        const timer = setTimeout(() => { socket.destroy(); reject(new Error('SMTP connection timed out.')); }, timeoutMs);
        const onError = error => { clearTimeout(timer); reject(error); };
        socket.once('error', onError);
        socket.once('connect', () => { clearTimeout(timer); socket.off('error', onError); resolve(socket); });
        socket.once('secureConnect', () => { clearTimeout(timer); socket.off('error', onError); resolve(socket); });
    });
}

function address(value) {
    const normalized = String(value || '').trim();
    if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(normalized)) throw new Error('Invalid email address.');
    return normalized;
}

function textBody(details) {
    return [
        'DAYNIZE 결제 완료 알림',
        '',
        `주문자 이름: ${details.buyerName}`,
        `주문자 이메일: ${details.buyerEmail}`,
        `결제 금액: ${details.amount.toLocaleString('ko-KR')}원`,
        `결제 수단: ${details.payMethod}`,
        `결제 시각: ${details.paidAt}`,
        `결제 ID: ${details.paymentId}`
    ].join(CRLF);
}

function buildMessage(details, from, to) {
    const subject = `DAYNIZE 결제 완료: ${details.buyerName}`;
    return [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        textBody(details)
    ].join(CRLF).replace(/\n/g, CRLF).replace(/\r\r\n/g, CRLF);
}

function sendWithLocalSendmail(message, sendmailPath) {
    return new Promise(resolve => {
        const child = spawn(sendmailPath, ['-t', '-oi'], { stdio: ['pipe', 'ignore', 'ignore'] });
        child.once('error', () => resolve(false));
        child.once('close', code => resolve(code === 0));
        child.stdin.end(message);
    });
}

async function sendPaymentCompletionEmail(details, options = {}) {
    const host = options.host ?? process.env.SMTP_HOST;
    const port = Number(options.port ?? process.env.SMTP_PORT ?? 587);
    const user = options.user ?? process.env.SMTP_USER;
    const pass = options.pass ?? process.env.SMTP_PASS;
    const secure = options.secure ?? ['1', 'true', 'yes'].includes(String(process.env.SMTP_SECURE || '').toLowerCase());
    const from = address(options.from ?? process.env.SMTP_FROM ?? user ?? 'no-reply@daynize.co.kr');
    const to = address(options.to ?? process.env.ADMIN_NOTIFICATION_EMAIL ?? 'ifonly1204@gmail.com');
    const message = buildMessage(details, from, to);
    if (!host || !user || !pass) {
        const sendmailPath = options.sendmailPath ?? process.env.SENDMAIL_PATH ?? '/usr/sbin/sendmail';
        return sendWithLocalSendmail(message, sendmailPath);
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SMTP_PORT.');

    let socket = await connect({ host, port, secure, timeoutMs: 10000 });
    try {
        await smtpCommand(socket, '');
        await smtpCommand(socket, `EHLO daynize-relay-api`);
        if (!secure && port === 587) {
            await smtpCommand(socket, 'STARTTLS', /^2/);
            await new Promise((resolve, reject) => {
                const upgraded = tls.connect({ socket, host, servername: host });
                upgraded.once('secureConnect', resolve);
                upgraded.once('error', reject);
                socket = upgraded;
            });
            await smtpCommand(socket, 'EHLO daynize-relay-api');
        }
        await smtpCommand(socket, 'AUTH LOGIN');
        await smtpCommand(socket, Buffer.from(user).toString('base64'));
        await smtpCommand(socket, Buffer.from(pass).toString('base64'));
        await smtpCommand(socket, `MAIL FROM:<${from}>`);
        await smtpCommand(socket, `RCPT TO:<${to}>`);
        await smtpCommand(socket, 'DATA', /^3/);
        socket.write(`${message.replace(/^\./gm, '..')}${CRLF}.${CRLF}`);
        await smtpCommand(socket, '', /^2/);
        await smtpCommand(socket, 'QUIT', /^2/);
    } finally {
        socket.end();
    }
    return true;
}

module.exports = { sendPaymentCompletionEmail };
