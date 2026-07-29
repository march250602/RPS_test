import {
  experimental_upgradeWebSocket,
  type WebSocketData,
} from '@vercel/functions';
import {
  handleScoreClientMessage,
  registerScoreClient,
  unregisterScoreClient,
} from '../../../server/realtimeScoreHub';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET() {
  return experimental_upgradeWebSocket(
    (socket) => {
      registerScoreClient(socket);

      socket.on('message', (data: WebSocketData) => {
        void handleScoreClientMessage(socket, data);
      });
      socket.on('close', () => {
        unregisterScoreClient(socket);
      });
      socket.on('error', () => {
        unregisterScoreClient(socket);
      });
    },
    { maxPayload: 16 * 1024 },
  );
}
