# Task 1.2: Environment Configuration

**Status**: Not Started  
**Priority**: 🔴 CRITICAL  
**Estimated Time**: 1 day  
**Agent**: DevOps/Backend Agent

---

## Objective

Create comprehensive environment variable documentation and validation so developers can configure the application without guessing.

---

## Steps

### Step 1: Create `.env.example`

1. **Analyze Code for Environment Variables**
   - Search for `process.env` usage
   - Check `__create/index.ts` for server-side vars
   - Check frontend code for `NEXT_PUBLIC_*` vars

2. **Create Template File**
   ```bash
   # .env.example
   
   # Database
   DATABASE_URL=postgresql://user:password@host:5432/database
   
   # Auth
   AUTH_SECRET=your-secret-key-here-min-32-chars
   
   # Application
   APP_URL=http://localhost:4000
   NODE_ENV=development
   
   # External APIs
   NEXT_PUBLIC_CREATE_API_BASE_URL=https://api.create.xyz
   CREATE_TEMP_API_KEY=your-api-key-here
   NEXT_PUBLIC_PROJECT_GROUP_ID=your-project-group-id
   
   # Stripe (if using direct Stripe)
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   
   # Lemonade/M-Pesa Integration
   LEMONADE_BASE_URL=https://api-v1.lemonade.services/api/v2
   LEMONADE_CONSUMER_KEY=your-consumer-key
   LEMONADE_CONSUMER_SECRET=your-consumer-secret
   LEMONADE_CLIENT_ID=your-client-id
   LEMONADE_CLIENT_SECRET=your-client-secret
   LEMONADE_RELAY_URL=https://relay.example.com
   LEMONADE_RELAY_KEY=your-relay-key
   LEMONADE_WALLET_ID=11391837
   LEMONADE_DISABLE_PROXY=false
   LEMONADE_ORGANIZATION_ID=your-org-id
   
   # CORS
   CORS_ORIGINS=http://localhost:4000,http://localhost:3000
   
   # Redis (for future use)
   REDIS_URL=redis://localhost:6379
   
   # Optional: Monitoring
   SENTRY_DSN=your-sentry-dsn
   ```

### Step 2: Create Environment Validation

1. **Create Validation Script**
   ```javascript
   // scripts/validate-env.js
   const requiredVars = [
     'DATABASE_URL',
     'AUTH_SECRET',
   ];
   
   const optionalVars = [
     'APP_URL',
     'NEXT_PUBLIC_CREATE_API_BASE_URL',
     'LEMONADE_BASE_URL',
     // ... etc
   ];
   
   function validateEnv() {
     const missing = [];
     const warnings = [];
     
     // Check required vars
     for (const varName of requiredVars) {
       if (!process.env[varName]) {
         missing.push(varName);
       }
     }
     
     // Check AUTH_SECRET length
     if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length < 32) {
       warnings.push('AUTH_SECRET should be at least 32 characters');
     }
     
     // Check DATABASE_URL format
     if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
       warnings.push('DATABASE_URL should start with postgresql://');
     }
     
     if (missing.length > 0) {
       console.error('❌ Missing required environment variables:');
       missing.forEach(v => console.error(`  - ${v}`));
       process.exit(1);
     }
     
     if (warnings.length > 0) {
       console.warn('⚠️  Environment variable warnings:');
       warnings.forEach(w => console.warn(`  - ${w}`));
     }
     
     console.log('✅ Environment variables validated');
   }
   
   validateEnv();
   ```

2. **Add to Package.json**
   ```json
   {
     "scripts": {
       "validate-env": "node scripts/validate-env.js",
       "dev": "npm run validate-env && react-router dev",
       "start": "npm run validate-env && react-router serve"
     }
   }
   ```

3. **Add Runtime Validation**
   ```javascript
   // web/__create/index.ts (add at top)
   import { validateEnv } from './validate-env';
   
   // Validate on server start
   validateEnv();
   ```

### Step 3: Create Documentation

1. **Create Environment Documentation**
   ```markdown
   # docs/ENVIRONMENT.md
   
   ## Environment Variables
   
   ### Required Variables
   
   #### DATABASE_URL
   - **Type**: String
   - **Format**: `postgresql://user:password@host:port/database`
   - **Description**: PostgreSQL connection string
   - **How to get**: From your database provider (Neon, Supabase, etc.)
   - **Example**: `postgresql://user:pass@localhost:5432/bridge`
   
   #### AUTH_SECRET
   - **Type**: String
   - **Min Length**: 32 characters
   - **Description**: Secret key for Auth.js session encryption
   - **How to generate**: 
     ```bash
     openssl rand -base64 32
     ```
   - **Security**: Never commit to version control
   
   ### Optional Variables
   
   [Document all optional variables...]
   
   ### Getting Started
   
   1. Copy `.env.example` to `.env`
   2. Fill in required variables
   3. Run `npm run validate-env` to check
   4. Start the application
   ```

---

## Deliverables

- [ ] `.env.example` - Template with all variables
- [ ] `scripts/validate-env.js` - Validation script
- [ ] `docs/ENVIRONMENT.md` - Complete documentation
- [ ] Updated `package.json` scripts

---

## Acceptance Criteria

- [ ] `.env.example` has all required variables
- [ ] Validation script runs on startup
- [ ] Clear error messages for missing variables
- [ ] Documentation explains how to get each variable
- [ ] New developer can set up environment in < 10 minutes

---

## Testing

1. **Test with Missing Variables**
   ```bash
   unset DATABASE_URL
   npm run validate-env
   # Should show error
   ```

2. **Test with Invalid Values**
   ```bash
   export AUTH_SECRET=short
   npm run validate-env
   # Should show warning
   ```

3. **Test with All Variables**
   ```bash
   cp .env.example .env
   # Fill in values
   npm run validate-env
   # Should pass
   ```

---

## Next Task

After completing this task, proceed to **Task 1.3: Security Fixes**



