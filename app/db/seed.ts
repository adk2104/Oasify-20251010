import 'dotenv/config';
import { db } from './config';
import { users } from './schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create test user
  const testEmail = 'demo@example.com';

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, testEmail))
    .limit(1);

  if (existingUser.length > 0) {
    console.log('✓ Test user already exists:', testEmail);
    console.log('  User ID:', existingUser[0].id);
  } else {
    // Insert test user (passwordless - no password needed)
    const [newUser] = await db
      .insert(users)
      .values({
        email: testEmail,
      })
      .returning();

    console.log('✓ Test user created:', testEmail);
    console.log('  User ID:', newUser.id);
  }

  console.log('\n✨ Database seeding complete!');
  console.log('\nTest credentials:');
  console.log('  Email:', testEmail);
  console.log('  (Passwordless - use email verification)');
}

seed()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
