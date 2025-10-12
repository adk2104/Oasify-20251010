import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Connection for queries
const queryClient = postgres(DATABASE_URL);

// Drizzle instance
export const db = drizzle(queryClient);
