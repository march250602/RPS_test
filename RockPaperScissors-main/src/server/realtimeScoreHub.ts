import type { RawData, WebSocket } from 'ws';
import type Redis from 'ioredis';
import {
  createHighScoreSubscriber,
  getHighScore,
  HIGH_SCORE_CHANNEL,
  isRedisConfigured,
  updateHighScore,
} from './highScoreStore';

type ClientMessage =
  | { type: 'ping' }
  | { type: 'score:sync' }
  | { type: 'score:update'; score: number };

type RealtimeHubState = {
  clients: Set<WebSocket>;
  subscriber: Redis | null;
  subscriberReady: Promise<void> | null;
  stopTimer: ReturnType<typeof setTimeout> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var rpsRealtimeHubState: RealtimeHubState | undefined;
}

function getHubState(): RealtimeHubState {
  if (!globalThis.rpsRealtimeHubState) {
    globalThis.rpsRealtimeHubState = {
      clients: new Set(),
      subscriber: null,
      subscriberReady: null,
      stopTimer: null,
    };
  }

  return globalThis.rpsRealtimeHubState;
}

function sendJson(socket: WebSocket, message: object) {
  if (socket.readyState !== 1) {
    return;
  }

  try {
    socket.send(JSON.stringify(message));
  } catch (error) {
    console.error('WebSocket send error:', error);
  }
}

function broadcastScore(highScore: number) {
  const message = {
    type: 'score:update',
    highScore,
    updatedAt: new Date().toISOString(),
  };

  getHubState().clients.forEach((client) => {
    sendJson(client, message);
  });
}

async function sendScoreSnapshot(socket: WebSocket) {
  try {
    sendJson(socket, {
      type: 'score:snapshot',
      highScore: await getHighScore(),
      durable: isRedisConfigured(),
    });
  } catch (error) {
    console.error('Unable to load realtime high score:', error);
    sendJson(socket, {
      type: 'error',
      message: 'Unable to load the latest high score',
    });
  }
}

async function stopRedisSubscriber() {
  const state = getHubState();
  const subscriber = state.subscriber;

  state.subscriber = null;
  state.subscriberReady = null;

  if (!subscriber) {
    return;
  }

  try {
    await subscriber.unsubscribe(HIGH_SCORE_CHANNEL);
  } catch (error) {
    console.error('Redis unsubscribe error:', error);
  } finally {
    subscriber.disconnect();
  }
}

async function ensureRedisSubscriber() {
  const state = getHubState();
  if (state.subscriberReady) {
    return state.subscriberReady;
  }

  const subscriber = createHighScoreSubscriber();
  if (!subscriber) {
    return;
  }

  state.subscriber = subscriber;
  subscriber.on('message', (channel, rawMessage) => {
    if (channel !== HIGH_SCORE_CHANNEL) {
      return;
    }

    try {
      const message = JSON.parse(rawMessage);
      const highScore = Number(message.highScore);
      if (message.type === 'score:update' && Number.isFinite(highScore)) {
        broadcastScore(highScore);
      }
    } catch (error) {
      console.error('Invalid Redis realtime message:', error);
    }
  });
  subscriber.on('error', (error) => {
    console.error('Redis subscriber error:', error.message);
  });

  state.subscriberReady = subscriber
    .subscribe(HIGH_SCORE_CHANNEL)
    .then(() => undefined)
    .catch((error) => {
      console.error('Unable to subscribe to realtime score updates:', error);
      state.subscriber = null;
      state.subscriberReady = null;
      subscriber.disconnect();
      throw error;
    });

  return state.subscriberReady;
}

function rawDataToString(data: RawData): string {
  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return Buffer.concat(data).toString('utf8');
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString('utf8');
  }

  return data.toString('utf8');
}

export function registerScoreClient(socket: WebSocket) {
  const state = getHubState();

  if (state.stopTimer) {
    clearTimeout(state.stopTimer);
    state.stopTimer = null;
  }

  state.clients.add(socket);
  void ensureRedisSubscriber().catch((error) => {
    console.error('Realtime subscriber startup failed:', error);
  });
  void sendScoreSnapshot(socket);
}

export function unregisterScoreClient(socket: WebSocket) {
  const state = getHubState();
  state.clients.delete(socket);

  if (state.clients.size === 0 && state.subscriber) {
    state.stopTimer = setTimeout(() => {
      if (getHubState().clients.size === 0) {
        void stopRedisSubscriber();
      }
    }, 1_000);
  }
}

export async function handleScoreClientMessage(
  socket: WebSocket,
  data: RawData,
) {
  let message: ClientMessage;

  try {
    message = JSON.parse(rawDataToString(data)) as ClientMessage;
  } catch {
    sendJson(socket, { type: 'error', message: 'Invalid JSON message' });
    return;
  }

  if (message.type === 'ping') {
    sendJson(socket, { type: 'pong', timestamp: Date.now() });
    return;
  }

  if (message.type === 'score:sync') {
    await sendScoreSnapshot(socket);
    return;
  }

  if (message.type !== 'score:update') {
    sendJson(socket, { type: 'error', message: 'Unknown message type' });
    return;
  }

  if (typeof message.score !== 'number' || !Number.isFinite(message.score)) {
    sendJson(socket, { type: 'error', message: 'Invalid score' });
    return;
  }

  try {
    await ensureRedisSubscriber();
    const result = await updateHighScore(message.score);

    if (result.updated) {
      if (!isRedisConfigured()) {
        broadcastScore(result.highScore);
      }
      return;
    }

    sendJson(socket, {
      type: 'score:snapshot',
      highScore: result.highScore,
      durable: isRedisConfigured(),
    });
  } catch (error) {
    console.error('Unable to update realtime high score:', error);
    sendJson(socket, {
      type: 'error',
      message: 'Unable to update high score',
    });
  }
}
