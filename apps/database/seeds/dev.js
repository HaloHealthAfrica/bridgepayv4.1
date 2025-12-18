/**
 * Development Seed Data
 * Creates test users and sample data for development
 */

import sql from '@/app/api/utils/sql';
import { hash } from 'argon2';

async function seedDev() {
  console.log('🌱 Seeding development data...');

  try {
    // Create test users
    const testUsers = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@test.com',
        name: 'Admin User',
        password: 'admin123',
        role: 'admin',
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'merchant@test.com',
        name: 'Merchant User',
        password: 'merchant123',
        role: 'merchant',
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        email: 'customer@test.com',
        name: 'Customer User',
        password: 'customer123',
        role: 'customer',
      },
    ];

    for (const userData of testUsers) {
      // Check if user exists
      const existing = await sql(
        'SELECT id FROM auth_users WHERE email = $1',
        [userData.email]
      );

      if (existing && existing[0]) {
        console.log(`  ⏭️  User ${userData.email} already exists`);
        continue;
      }

      // Create user
      await sql(
        `INSERT INTO auth_users (id, name, email, role) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (email) DO NOTHING`,
        [userData.id, userData.name, userData.email, userData.role]
      );

      // Create account with hashed password
      const hashedPassword = await hash(userData.password);
      await sql(
        `INSERT INTO auth_accounts 
         ("userId", provider, type, "providerAccountId", password) 
         VALUES ($1, 'credentials', 'credentials', $1, $2)
         ON CONFLICT (provider, "providerAccountId") DO NOTHING`,
        [userData.id, hashedPassword]
      );

      // Create wallet
      await sql(
        `INSERT INTO wallets (user_id, currency, balance) 
         VALUES ($1, 'KES', 10000)
         ON CONFLICT (user_id, currency) DO NOTHING`,
        [userData.id]
      );

      console.log(`  ✅ Created user: ${userData.email} (${userData.role})`);
    }

    // Create platform wallet
    const platformEmail = 'platform@bridge.internal';
    const platformUser = await sql(
      'SELECT id FROM auth_users WHERE email = $1',
      [platformEmail]
    );

    if (!platformUser || !platformUser[0]) {
      const platformId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
      await sql(
        `INSERT INTO auth_users (id, name, email, role) 
         VALUES ($1, 'Bridge Platform', $2, 'admin')`,
        [platformId, platformEmail]
      );

      await sql(
        `INSERT INTO wallets (user_id, currency, balance) 
         VALUES ($1, 'KES', 0)
         ON CONFLICT (user_id, currency) DO NOTHING`,
        [platformId]
      );

      console.log('  ✅ Created platform wallet');
    }

    // Create sample shop for merchant
    const merchant = await sql(
      "SELECT id FROM auth_users WHERE email = 'merchant@test.com'"
    );

    if (merchant && merchant[0]) {
      const shop = await sql(
        `INSERT INTO shops (merchant_user_id, name, description) 
         VALUES ($1, 'Test Shop', 'A test shop for development')
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [merchant[0].id]
      );

      if (shop && shop[0]) {
        // Create sample product
        await sql(
          `INSERT INTO products (shop_id, name, description, price, currency, stock) 
           VALUES ($1, 'Test Product', 'A test product', 1000, 'KES', 100)
           ON CONFLICT DO NOTHING`,
          [shop[0].id]
        );

        console.log('  ✅ Created sample shop and product');
      }
    }

    console.log('✅ Development seed data created successfully');
  } catch (error) {
    console.error('❌ Error seeding development data:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDev()
    .then(() => {
      console.log('Done');
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seedDev;



