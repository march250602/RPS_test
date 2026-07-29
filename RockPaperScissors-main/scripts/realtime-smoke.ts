import assert from 'node:assert/strict';
import { once } from 'node:events';
import {
  WebSocket,
  WebSocketServer,
  type RawData,
} from 'ws';
import {
  handleScoreClientMessage,
  registerScoreClient,
  unregisterScoreClient,
} from '../src/server/realtimeScoreHub';

delete process.env.REDIS_URL;

function waitForOpen(socket: WebSocket) {
  if (socket.readyState === WebSocket.OPEN) {
    return Promise.resolve();
  }

  return once(socket, 'open').then(() => undefined);
}

function waitForBroadcast(socket: WebSocket, expectedScore: number) {
  return new Promise<number>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error(`Timed out waiting for score ${expectedScore}`));
    }, 5_000);

    const onMessage = (data: RawData) => {
      const message = JSON.parse(data.toString());
      if (
        message.type === 'score:update' &&
        message.highScore === expectedScore
      ) {
        clearTimeout(timeout);
        socket.off('message', onMessage);
        resolve(message.highScore);
      }
    };

    socket.on('message', onMessage);
  });
}

async function closeServer(server: WebSocketServer) {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}

async function main() {
  const externalUrl = process.env.REALTIME_TEST_URL;
  let server: WebSocketServer | null = null;
  let socketUrl = externalUrl;

  if (!socketUrl) {
    server = new WebSocketServer({ port: 0 });
    server.on('connection', (socket) => {
      registerScoreClient(socket);
      socket.on('message', (data) => {
        void handleScoreClientMessage(socket, data);
      });
      socket.on('close', () => {
        unregisterScoreClient(socket);
      });
    });

    await once(server, 'listening');
    const address = server.address();
    assert(address && typeof address !== 'string');
    socketUrl = `ws://127.0.0.1:${address.port}`;
  }

  assert(socketUrl);
  const browserA = new WebSocket(socketUrl);
  const browserB = new WebSocket(socketUrl);

  try {
    await Promise.all([waitForOpen(browserA), waitForOpen(browserB)]);

    const expectedScore = Number(process.env.REALTIME_TEST_SCORE ?? 42);
    const browserAUpdate = waitForBroadcast(browserA, expectedScore);
    const browserBUpdate = waitForBroadcast(browserB, expectedScore);

    browserA.send(
      JSON.stringify({ type: 'score:update', score: expectedScore }),
    );

    const receivedScores = await Promise.all([
      browserAUpdate,
      browserBUpdate,
    ]);
    assert.deepEqual(receivedScores, [expectedScore, expectedScore]);

    console.log(
      `Realtime broadcast passed: both browsers received ${expectedScore}.`,
    );
  } finally {
    browserA.close();
    browserB.close();
    await Promise.all([once(browserA, 'close'), once(browserB, 'close')]);
    if (server) {
      await closeServer(server);
    }
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
