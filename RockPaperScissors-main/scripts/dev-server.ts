import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import {
  handleScoreClientMessage,
  registerScoreClient,
  unregisterScoreClient,
} from '../src/server/realtimeScoreHub';

const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOSTNAME ?? '0.0.0.0';

async function main() {
  const { default: next } = await import('next');
  const app = next({ dev: true, hostname, port });

  await app.prepare();
  const requestHandler = app.getRequestHandler();
  const nextUpgradeHandler = app.getUpgradeHandler();

  const server = createServer((request, response) => {
    void requestHandler(request, response);
  });
  const scoreServer = new WebSocketServer({
    noServer: true,
    maxPayload: 16 * 1024,
  });

  scoreServer.on('connection', (socket) => {
    registerScoreClient(socket);
    socket.on('message', (data) => {
      void handleScoreClientMessage(socket, data);
    });
    socket.on('close', () => {
      unregisterScoreClient(socket);
    });
    socket.on('error', () => {
      unregisterScoreClient(socket);
    });
  });

  server.on('upgrade', (request, socket, head) => {
    const requestUrl = new URL(
      request.url ?? '/',
      `http://${request.headers.host ?? 'localhost'}`,
    );

    if (requestUrl.pathname === '/api/ws') {
      scoreServer.handleUpgrade(request, socket, head, (webSocket) => {
        scoreServer.emit('connection', webSocket, request);
      });
      return;
    }

    nextUpgradeHandler(request, socket, head);
  });

  server.listen(port, hostname, () => {
    console.log(`> Frontend and WebSocket ready on http://localhost:${port}`);
  });
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
