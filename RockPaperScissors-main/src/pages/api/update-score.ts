import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getHighScore,
  updateHighScore,
} from '../../server/highScoreStore';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const score = req.body?.score;
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      return res.status(400).json({
        res: 'invalid score',
        highScore: await getHighScore(),
      });
    }

    const result = await updateHighScore(score);

    return res.status(201).json({
      res: result.updated ? 'successfully updated' : 'no update needed',
      highScore: result.highScore,
    });
  } catch (error) {
    console.error('Unable to update high score:', error);
    return res.status(500).json({ message: 'Unable to update high score' });
  }
}
