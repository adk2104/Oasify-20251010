import 'dotenv/config';
import { db } from './config';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create test user
  const testEmail = 'demo@example.com';
  const testPassword = 'password';

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
    // Hash the password
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    // Insert test user
    const [newUser] = await db
      .insert(users)
      .values({
        email: testEmail,
        password: hashedPassword,
      })
      .returning();

    console.log('✓ Test user created:', testEmail);
    console.log('  User ID:', newUser.id);
    console.log('  Password:', testPassword);
  }

  console.log('\n✨ Database seeding complete!');
  console.log('\nTest credentials:');
  console.log('  Email:', testEmail);
  console.log('  Password:', testPassword);
}

seed()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
