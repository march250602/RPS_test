import type { NextApiRequest, NextApiResponse } from 'next';

const choices = ['paper', 'scissors', 'rock'] as const;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const randomIndex = Math.floor(Math.random() * choices.length);

  return res.status(200).json({
    choice: choices[randomIndex],
    timestamp: new Date().toISOString(),
  });
}
