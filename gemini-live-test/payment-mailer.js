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

// 회원 본인에게 보내는 결제 실패/유예/정지 안내 메일. 위 sendPaymentCompletionEmail은 관리자(운영자)
// 알림 전용이라 수신자가 ADMIN_NOTIFICATION_EMAIL로 고정돼 있어 재사용할 수 없으므로, 같은 SMTP 전송
// 로직(connect/smtpCommand)을 그대로 쓰되 임의의 수신자/제목/본문을 받는 범용 발송 함수를 추가한다.
function buildMemberMessage({ to, subject, bodyLines }, from) {
    return [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        bodyLines.join(CRLF)
    ].join(CRLF).replace(/\n/g, CRLF).replace(/\r\r\n/g, CRLF);
}

async function sendMemberEmail({ to, subject, bodyLines }, options = {}) {
    const host = options.host ?? process.env.SMTP_HOST;
    const port = Number(options.port ?? process.env.SMTP_PORT ?? 587);
    const user = options.user ?? process.env.SMTP_USER;
    const pass = options.pass ?? process.env.SMTP_PASS;
    const secure = options.secure ?? ['1', 'true', 'yes'].includes(String(process.env.SMTP_SECURE || '').toLowerCase());
    const from = address(options.from ?? process.env.SMTP_FROM ?? user ?? 'no-reply@daynize.co.kr');
    const recipient = address(to);
    const message = buildMemberMessage({ to: recipient, subject, bodyLines }, from);
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
        await smtpCommand(socket, `RCPT TO:<${recipient}>`);
        await smtpCommand(socket, 'DATA', /^3/);
        socket.write(`${message.replace(/^\./gm, '..')}${CRLF}.${CRLF}`);
        await smtpCommand(socket, '', /^2/);
        await smtpCommand(socket, 'QUIT', /^2/);
    } finally {
        socket.end();
    }
    return true;
}

// 정기결제 실패 직후(유예 기간 시작) — 카드 변경을 안내한다.
async function sendPaymentFailedEmail({ to, name }, options = {}) {
    const greeting = name ? `${name}님, 안녕하세요.` : '안녕하세요.';
    return sendMemberEmail({
        to,
        subject: '[데이나이즈] 정기결제에 실패했습니다 — 결제 수단을 확인해 주세요',
        bodyLines: [
            greeting,
            '',
            'DAYNIZE 월 정기결제(19,000원, VAT 포함)가 등록된 카드로 처리되지 않았습니다.',
            '카드 한도 초과, 유효기간 만료, 분실/재발급 등이 주로 원인이 됩니다.',
            '',
            '지금부터 3일간은 학습 권한이 그대로 유지되며, 그 사이 카드를 변경하시면',
            '별도 조치 없이 정상적으로 이용을 이어가실 수 있습니다.',
            '',
            '카드 변경 방법: 마이페이지(프로필) > 이용권 관리 > 결제 카드 변경',
            `바로가기: https://www.daynize.co.kr`,
            '',
            '3일이 지나도 결제가 계속 실패하면 구독이 일시 정지될 수 있습니다.',
            '',
            '문의사항이 있으시면 아래로 연락해 주세요.',
            '고객센터: 070-4010-1147',
            '이메일: contact@daynize.co.kr',
            '',
            'DAYNIZE 드림'
        ]
    }, options);
}

// 유예 기간(3일) 동안 재결제가 끝내 실패해 구독이 정지된 시점에 발송.
async function sendSubscriptionSuspendedEmail({ to, name }, options = {}) {
    const greeting = name ? `${name}님, 안녕하세요.` : '안녕하세요.';
    return sendMemberEmail({
        to,
        subject: '[데이나이즈] 정기결제 실패로 구독이 일시 정지되었습니다',
        bodyLines: [
            greeting,
            '',
            '3일간의 결제 유예 기간 동안에도 정기결제가 완료되지 않아,',
            'DAYNIZE 구독 이용이 일시 정지되었습니다.',
            '',
            '마이페이지에서 결제 카드를 변경하시면 즉시 미납 금액(19,000원)이',
            '재청구되며, 결제가 완료되는 즉시 이용이 다시 정상화됩니다.',
            '',
            '카드 변경 방법: 마이페이지(프로필) > 이용권 관리 > 결제 카드 변경',
            `바로가기: https://www.daynize.co.kr`,
            '',
            '문의사항이 있으시면 아래로 연락해 주세요.',
            '고객센터: 070-4010-1147',
            '이메일: contact@daynize.co.kr',
            '',
            'DAYNIZE 드림'
        ]
    }, options);
}

module.exports = { sendPaymentCompletionEmail, sendPaymentFailedEmail, sendSubscriptionSuspendedEmail };
