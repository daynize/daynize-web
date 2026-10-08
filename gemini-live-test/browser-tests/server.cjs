const { createRelayServer } = require('../server');
const relay = createRelayServer({ apiKey: '', publicOrigin: undefined });
relay.server.listen(8091, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => relay.close());