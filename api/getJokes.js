import * as Sentry from '@sentry/node';
import { jokes } from '../drizzle/schema.js';
import { authenticateUser } from './_apiUtils.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const user = await authenticateUser(req);

    const sql = postgres(process.env.COCKROACH_DB_URL);
    const db = drizzle(sql);

    const result = await db.select()
      .from(jokes)
      .where(eq(jokes.userId, user.id))
      .limit(10);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching jokes:', error);
    Sentry.captureException(error);
    if (error.message.includes('Authorization') || error.message.includes('token')) {
      res.status(401).json({ error: 'Authentication failed' });
    } else {
      res.status(500).json({ error: 'Error fetching jokes' });
    }
  }
}