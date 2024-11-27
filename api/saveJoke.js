import * as Sentry from '@sentry/node';
import { jokes } from '../drizzle/schema.js';
import { authenticateUser } from './_apiUtils.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const user = await authenticateUser(req);

    const { setup, punchline } = req.body;

    if (!setup || !punchline) {
      return res.status(400).json({ error: 'Setup and punchline are required' });
    }

    const sql = postgres(process.env.COCKROACH_DB_URL);
    const db = drizzle(sql);

    const result = await db.insert(jokes).values({
      setup,
      punchline,
      userId: user.id
    }).returning();

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error saving joke:', error);
    Sentry.captureException(error);
    if (error.message.includes('Authorization') || error.message.includes('token')) {
      res.status(401).json({ error: 'Authentication failed' });
    } else {
      res.status(500).json({ error: 'Error saving joke' });
    }
  }
}