# Task 1.1: Database Schema Documentation

**Status**: Not Started  
**Priority**: 🔴 CRITICAL  
**Estimated Time**: 2-3 days  
**Agent**: Database/Backend Agent

---

## Objective

Extract, document, and create migration files for the database schema so the application can be set up from scratch.

---

## Steps

### Step 1: Extract Current Schema

1. **Connect to Database**
   ```bash
   # Get connection string from environment
   echo $DATABASE_URL
   ```

2. **Generate Schema Dump**
   ```bash
   # Using pg_dump (if you have direct access)
   pg_dump --schema-only --no-owner --no-acl $DATABASE_URL > database/schema.sql
   
   # OR using Neon CLI (if using Neon)
   neonctl db dump --schema-only > database/schema.sql
   ```

3. **Alternative: Extract via Code**
   - If direct DB access not available, create a script to extract schema:
   ```javascript
   // scripts/extract-schema.js
   import sql from '@/app/api/utils/sql';
   
   async function extractSchema() {
     // Get all tables
     const tables = await sql`
       SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public'
       ORDER BY table_name
     `;
     
     // For each table, get columns, constraints, indexes
     for (const table of tables) {
       const columns = await sql`
         SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_name = ${table.table_name}
         ORDER BY ordinal_position
       `;
       
       const constraints = await sql`
         SELECT constraint_name, constraint_type
         FROM information_schema.table_constraints
         WHERE table_name = ${table.table_name}
       `;
       
       const indexes = await sql`
         SELECT indexname, indexdef
         FROM pg_indexes
         WHERE tablename = ${table.table_name}
       `;
       
       console.log(`\n## Table: ${table.table_name}`);
       console.log('Columns:', columns);
       console.log('Constraints:', constraints);
       console.log('Indexes:', indexes);
     }
   }
   
   extractSchema();
   ```

### Step 2: Create Migration System

1. **Choose Migration Tool**
   - Option A: Drizzle ORM (recommended for TypeScript)
   - Option B: Raw SQL migrations (simpler, more control)
   - Option C: Prisma (if you want full ORM)

2. **Set Up Drizzle (Recommended)**
   ```bash
   cd web
   npm install drizzle-orm drizzle-kit @neondatabase/serverless
   ```

3. **Create Drizzle Config**
   ```typescript
   // web/drizzle.config.ts
   import type { Config } from 'drizzle-kit';
   
   export default {
     schema: './src/db/schema.ts',
     out: './database/migrations',
     driver: 'pg',
     dbCredentials: {
       connectionString: process.env.DATABASE_URL!,
     },
   } satisfies Config;
   ```

4. **Create Initial Schema File**
   ```typescript
   // web/src/db/schema.ts
   import { pgTable, text, timestamp, uuid, decimal, jsonb, boolean } from 'drizzle-orm/pg-core';
   
   // Auth tables
   export const authUsers = pgTable('auth_users', {
     id: uuid('id').primaryKey(),
     name: text('name'),
     email: text('email').notNull().unique(),
     emailVerified: timestamp('emailVerified'),
     image: text('image'),
     role: text('role').default('customer'),
     createdAt: timestamp('createdAt').defaultNow(),
     updatedAt: timestamp('updatedAt').defaultNow(),
   });
   
   export const authSessions = pgTable('auth_sessions', {
     id: uuid('id').primaryKey(),
     sessionToken: text('sessionToken').notNull().unique(),
     userId: uuid('userId').notNull().references(() => authUsers.id),
     expires: timestamp('expires').notNull(),
     createdAt: timestamp('createdAt').defaultNow(),
   });
   
   // Wallet tables
   export const wallets = pgTable('wallets', {
     id: uuid('id').primaryKey(),
     userId: uuid('userId').notNull().references(() => authUsers.id),
     balance: decimal('balance', { precision: 19, scale: 4 }).default('0'),
     currency: text('currency').default('KES'),
     createdAt: timestamp('createdAt').defaultNow(),
     updatedAt: timestamp('updatedAt').defaultNow(),
   });
   
   export const walletLedger = pgTable('wallet_ledger', {
     id: uuid('id').primaryKey(),
     walletId: uuid('walletId').notNull().references(() => wallets.id),
     counterpartyWalletId: uuid('counterpartyWalletId'),
     entryType: text('entryType').notNull(), // 'debit' | 'credit'
     amount: decimal('amount', { precision: 19, scale: 4 }).notNull(),
     currency: text('currency').default('KES'),
     status: text('status').default('posted'),
     ref: text('ref').notNull().unique(),
     externalRef: text('externalRef'),
     narration: text('narration'),
     metadata: jsonb('metadata'),
     balanceAfter: decimal('balanceAfter', { precision: 19, scale: 4 }),
     createdAt: timestamp('createdAt').defaultNow(),
     postedAt: timestamp('postedAt'),
   });
   
   // Add more tables based on extracted schema...
   ```

5. **Generate Migration from Current Schema**
   ```bash
   # Generate migration from current database
   npx drizzle-kit introspect
   
   # OR generate migration from schema file
   npx drizzle-kit generate
   ```

### Step 3: Document Schema

1. **Create Schema Documentation**
   ```markdown
   # database/README.md
   
   ## Database Schema
   
   ### Overview
   This database uses PostgreSQL and follows a double-entry bookkeeping pattern for financial transactions.
   
   ### Tables
   
   #### auth_users
   - **Purpose**: User accounts
   - **Key Fields**: id, email, role
   - **Relationships**: 
     - One-to-many with auth_sessions
     - One-to-many with wallets
   
   #### wallets
   - **Purpose**: User wallet balances
   - **Key Fields**: id, userId, balance, currency
   - **Relationships**:
     - Many-to-one with auth_users
     - One-to-many with wallet_ledger
   
   #### wallet_ledger
   - **Purpose**: Double-entry ledger for all wallet transactions
   - **Key Fields**: id, walletId, entryType, amount, ref
   - **Constraints**: ref must be unique (idempotency)
   - **Relationships**:
     - Many-to-one with wallets
   
   [Continue for all tables...]
   ```

2. **Create ER Diagram**
   - Use a tool like dbdiagram.io or draw.io
   - Document all relationships
   - Include cardinality

### Step 4: Create Seed Scripts

1. **Development Seed Data**
   ```javascript
   // database/seeds/dev.js
   import sql from '@/app/api/utils/sql';
   import { hash } from 'argon2';
   
   async function seedDev() {
     // Create test users
     const testUsers = [
       {
         id: '00000000-0000-0000-0000-000000000001',
         email: 'admin@test.com',
         password: await hash('admin123'),
         role: 'admin',
       },
       {
         id: '00000000-0000-0000-0000-000000000002',
         email: 'merchant@test.com',
         password: await hash('merchant123'),
         role: 'merchant',
       },
       {
         id: '00000000-0000-0000-0000-000000000003',
         email: 'customer@test.com',
         password: await hash('customer123'),
         role: 'customer',
       },
     ];
     
     for (const user of testUsers) {
       // Insert user and account
       // ...
     }
     
     console.log('✅ Dev seed data created');
   }
   
   seedDev();
   ```

2. **Test Data Scripts**
   ```javascript
   // database/seeds/test.js
   // Minimal data for testing
   ```

---

## Deliverables

- [ ] `database/schema.sql` - Full schema dump
- [ ] `database/migrations/001_initial_schema.sql` - Initial migration
- [ ] `web/src/db/schema.ts` - Drizzle schema (if using Drizzle)
- [ ] `database/README.md` - Schema documentation
- [ ] `database/seeds/dev.js` - Development seed data
- [ ] `database/seeds/test.js` - Test seed data
- [ ] ER diagram (in README or separate file)

---

## Acceptance Criteria

- [ ] New developer can run `npm run db:migrate` to create database
- [ ] All tables are documented with purpose
- [ ] All relationships are documented
- [ ] Seed scripts work correctly
- [ ] Schema can be version controlled
- [ ] Migrations are reversible (if possible)

---

## Testing

1. **Test Migration**
   ```bash
   # Create fresh database
   createdb bridge_test
   
   # Run migrations
   npm run db:migrate
   
   # Verify tables exist
   psql bridge_test -c "\dt"
   ```

2. **Test Seed Scripts**
   ```bash
   npm run db:seed:dev
   # Verify data exists
   ```

---

## Notes

- If using Neon, you may need to use their API for schema extraction
- Consider using a tool like `pg_dump` for initial schema extraction
- Document any custom functions, triggers, or views
- Include indexes in documentation (they affect performance)

---

## Next Task

After completing this task, proceed to **Task 1.2: Environment Configuration**



