import Redis from 'ioredis';

type HighScoreState = {
  value: number;
};

const HIGH_SCORE_KEY = 'rps:high-score';
export const HIGH_SCORE_CHANNEL = 'rps:high-score:updates';

declare global {
  // eslint-disable-next-line no-var
  var rpsHighScoreState: HighScoreState | undefined;
  // eslint-disable-next-line no-var
  var rpsRedisPublisher: Redis | undefined;
}

function getState(): HighScoreState {
  if (!globalThis.rpsHighScoreState) {
    globalThis.rpsHighScoreState = { value: 0 };
  }

  return globalThis.rpsHighScoreState;
}

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}

function getRedisPublisher(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  if (!globalThis.rpsRedisPublisher) {
    globalThis.rpsRedisPublisher = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    globalThis.rpsRedisPublisher.on('error', (error) => {
      console.error('Redis publisher error:', error.message);
    });
  }

  return globalThis.rpsRedisPublisher;
}

export function createHighScoreSubscriber(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });
}

export async function getHighScore(): Promise<number> {
  const redis = getRedisPublisher();
  if (!redis) {
    return getState().value;
  }

  const storedScore = await redis.get(HIGH_SCORE_KEY);
  const highScore = Number(storedScore ?? 0);
  const normalizedScore = Number.isFinite(highScore) ? highScore : 0;
  getState().value = normalizedScore;

  return normalizedScore;
}

export async function updateHighScore(playerScore: number) {
  const state = getState();

  if (!Number.isFinite(playerScore)) {
    return { updated: false, highScore: state.value };
  }

  const redis = getRedisPublisher();
  if (redis) {
    const result = (await redis.eval(
      `
        local current = tonumber(redis.call('GET', KEYS[1]) or '0')
        local candidate = tonumber(ARGV[1])

        if candidate and candidate > current then
          redis.call('SET', KEYS[1], candidate)
          redis.call(
            'PUBLISH',
            KEYS[2],
            cjson.encode({ type = 'score:update', highScore = candidate })
          )
          return { 1, candidate }
        end

        return { 0, current }
      `,
      2,
      HIGH_SCORE_KEY,
      HIGH_SCORE_CHANNEL,
      String(playerScore),
    )) as [number, number];

    const updated = Number(result[0]) === 1;
    const highScore = Number(result[1]);
    state.value = highScore;

    return { updated, highScore };
  }

  if (playerScore > state.value) {
    state.value = playerScore;
    return { updated: true, highScore: state.value };
  }

  return { updated: false, highScore: state.value };
}
