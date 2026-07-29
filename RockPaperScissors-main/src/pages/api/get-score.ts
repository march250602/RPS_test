import type { NextApiRequest, NextApiResponse } from 'next';
import { getHighScore } from '../../server/highScoreStore';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    return res.status(200).json({ score: await getHighScore() });
  } catch (error) {
    console.error('Unable to get high score:', error);
    return res.status(500).json({ message: 'Unable to get high score' });
  }
}
