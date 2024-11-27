import { jokes } from '../drizzle/schema.js';
import { authenticateUser } from './_apiUtils.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const user = await authenticateUser(req);
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Joke ID is required' });
    }

    const sql = postgres(process.env.COCKROACH_DB_URL_DB_URL);
    const db = drizzle(sql);

    const result = await db
      .delete(jokes)
      .where(eq(jokes.id, id), eq(jokes.userId, user.id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Joke not found' });
    }

    res.status(200).json({ message: 'Joke deleted successfully' });
  } catch (error) {
    console.error('Error deleting joke:', error);
    if (error.message.includes('Authorization') || error.message.includes('token')) {
      res.status(401).json({ error: 'Authentication failed' });
    } else {
      res.status(500).json({ error: 'Error deleting joke' });
    }
  }
}