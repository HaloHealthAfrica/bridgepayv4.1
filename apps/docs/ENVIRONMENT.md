# Environment Variables Documentation

## Overview

This document describes all environment variables used by Bridge MVP v3. Copy `.env.example` to `.env` and fill in the values.

## Required Variables

### DATABASE_URL
- **Type**: String
- **Format**: `postgresql://user:password@host:port/database`
- **Description**: PostgreSQL connection string
- **How to get**: 
  - Neon: From your Neon project dashboard
  - Supabase: From your Supabase project settings
  - Self-hosted: Your PostgreSQL connection string
- **Example**: `postgresql://user:pass@localhost:5432/bridge`
- **Security**: Never commit to version control

### AUTH_SECRET
- **Type**: String
- **Min Length**: 32 characters
- **Description**: Secret key for Auth.js session encryption and JWT signing
- **How to generate**: 
  ```bash
  openssl rand -base64 32
  ```
- **Security**: Must be kept secret, never commit to version control
- **Example**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

## Optional Variables

### Application Configuration

#### APP_URL
- **Type**: String (URL)
- **Description**: Base URL of the application (used for callbacks, webhooks, etc.)
- **Default**: `http://localhost:4000`
- **Example**: `https://bridge.example.com`

#### NODE_ENV
- **Type**: String
- **Values**: `development`, `production`, `test`
- **Default**: `development`
- **Description**: Node.js environment

### External APIs

#### NEXT_PUBLIC_CREATE_API_BASE_URL
- **Type**: String (URL)
- **Description**: Base URL for Create.xyz API (if using external Create API)
- **Example**: `https://api.create.xyz`

#### CREATE_TEMP_API_KEY
- **Type**: String
- **Description**: API key for Create.xyz services
- **How to get**: From Create.xyz dashboard

#### NEXT_PUBLIC_PROJECT_GROUP_ID
- **Type**: String
- **Description**: Project group identifier for Create.xyz
- **How to get**: From Create.xyz dashboard

#### NEXT_PUBLIC_CREATE_BASE_URL
- **Type**: String (URL)
- **Description**: Base URL for Create.xyz integrations proxy
- **Default**: `https://www.create.xyz`

#### NEXT_PUBLIC_CREATE_HOST
- **Type**: String
- **Description**: Host header for Create.xyz integrations
- **Default**: `localhost:4000`

### Stripe Integration (Optional)

#### STRIPE_SECRET_KEY
- **Type**: String
- **Description**: Stripe secret key
- **How to get**: https://dashboard.stripe.com/apikeys
- **Format**: `sk_test_...` or `sk_live_...`

#### STRIPE_PUBLISHABLE_KEY
- **Type**: String
- **Description**: Stripe publishable key (for frontend)
- **How to get**: https://dashboard.stripe.com/apikeys
- **Format**: `pk_test_...` or `pk_live_...`

#### STRIPE_WEBHOOK_SECRET
- **Type**: String
- **Description**: Stripe webhook signing secret
- **How to get**: From Stripe webhook configuration
- **Format**: `whsec_...`

### Lemonade / M-Pesa Integration

#### LEMONADE_BASE_URL
- **Type**: String (URL)
- **Description**: Lemonade API base URL
- **Default**: `https://api-v1.lemonade.services/api/v2`
- **Example**: `https://staging-api.mylemonade.io/api/v2` (for staging)

#### LEMONADE_CONSUMER_KEY
- **Type**: String
- **Description**: Lemonade consumer key (legacy authentication)
- **How to get**: From Lemonade dashboard
- **Note**: Use either consumer key/secret OR client credentials

#### LEMONADE_CONSUMER_SECRET
- **Type**: String
- **Description**: Lemonade consumer secret (legacy authentication)
- **How to get**: From Lemonade dashboard
- **Security**: Keep secret

#### LEMONADE_CLIENT_ID
- **Type**: String
- **Description**: Lemonade OAuth client ID (preferred for staging/production)
- **How to get**: From Lemonade dashboard
- **Note**: Use either consumer key/secret OR client credentials

#### LEMONADE_CLIENT_SECRET
- **Type**: String
- **Description**: Lemonade OAuth client secret
- **How to get**: From Lemonade dashboard
- **Security**: Keep secret

#### LEMONADE_RELAY_URL
- **Type**: String (URL)
- **Description**: Lemonade relay/proxy URL (optional)
- **Example**: `https://relay.example.com`

#### LEMONADE_RELAY_KEY
- **Type**: String
- **Description**: API key for Lemonade relay
- **How to get**: From relay provider

#### LEMONADE_DISABLE_PROXY
- **Type**: Boolean (string)
- **Values**: `true`, `false`
- **Default**: `false`
- **Description**: Disable relay/proxy mode

#### LEMONADE_WALLET_ID
- **Type**: String
- **Description**: Default merchant wallet ID
- **Default**: `11391837`

#### LEMONADE_ORGANIZATION_ID
- **Type**: String
- **Description**: Lemonade organization ID (optional)
- **How to get**: From Lemonade dashboard

### CORS Configuration

#### CORS_ORIGINS
- **Type**: String (comma-separated)
- **Description**: Allowed CORS origins
- **Format**: `origin1,origin2,origin3`
- **Example**: `http://localhost:4000,http://localhost:3000,https://bridge.example.com`

### Redis (Required for message queues)

#### REDIS_URL
- **Type**: String (URL)
- **Description**: Redis connection string for BullMQ message queues
- **Format**: `redis://user:password@host:port` or `redis://host:port`
- **Example**: `redis://localhost:6379`
- **Required**: Yes (for async payment and webhook processing)
- **How to get**: 
  - Local: Install Redis locally or use Docker
  - Cloud: Use Redis Cloud, AWS ElastiCache, or similar
- **Note**: Required for message queue functionality (Phase 3)

### Email Notifications (Optional)

#### RESEND_API_KEY
- **Type**: String
- **Description**: Resend API key for sending emails
- **How to get**: https://resend.com/api-keys
- **Format**: `re_...`
- **Required**: Yes (for email notifications)
- **Note**: Free tier available (100 emails/day)

#### RESEND_FROM_EMAIL
- **Type**: String (Email)
- **Description**: Default sender email address
- **Format**: `Name <email@domain.com>` or `email@domain.com`
- **Default**: `Bridge <noreply@bridge.example.com>`
- **Note**: Must be verified in Resend dashboard

### SMS Notifications (Optional)

#### TWILIO_ACCOUNT_SID
- **Type**: String
- **Description**: Twilio Account SID for SMS
- **How to get**: https://console.twilio.com
- **Note**: Optional, SMS notifications disabled if not set

#### TWILIO_AUTH_TOKEN
- **Type**: String
- **Description**: Twilio Auth Token
- **How to get**: https://console.twilio.com
- **Security**: Keep secret

#### TWILIO_PHONE_NUMBER
- **Type**: String
- **Description**: Twilio phone number for sending SMS
- **Format**: `+1234567890`
- **How to get**: From Twilio console

### Monitoring (Optional)

#### SENTRY_DSN
- **Type**: String (URL)
- **Description**: Sentry DSN for error tracking
- **How to get**: From Sentry project settings
- **Format**: `https://key@sentry.io/project-id`

## Environment-Specific Configuration

### Development
```bash
NODE_ENV=development
APP_URL=http://localhost:4000
DATABASE_URL=postgresql://localhost:5432/bridge_dev
```

### Production
```bash
NODE_ENV=production
APP_URL=https://bridge.example.com
DATABASE_URL=postgresql://prod-host:5432/bridge_prod
AUTH_SECRET=<strong-secret-32-chars-min>
```

## Validation

Run the validation script to check your environment variables:

```bash
node scripts/validate-env.js
```

Or it will run automatically on application startup if configured.

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different secrets** for development, staging, and production
3. **Rotate secrets regularly**, especially `AUTH_SECRET`
4. **Use strong passwords** (minimum 32 characters for `AUTH_SECRET`)
5. **Restrict access** to production environment variables
6. **Use secret management** tools (AWS Secrets Manager, HashiCorp Vault, etc.) in production

## Getting Started

1. Copy `.env.example` to `.env`
2. Fill in required variables (`DATABASE_URL`, `AUTH_SECRET`)
3. Fill in optional variables as needed
4. Run `node scripts/validate-env.js` to verify
5. Start the application

## Troubleshooting

### "Missing DATABASE_URL"
- Ensure you've set the `DATABASE_URL` variable
- Check that the connection string is correct
- Verify database is accessible

### "AUTH_SECRET must be at least 32 characters"
- Generate a new secret: `openssl rand -base64 32`
- Update your `.env` file

### "DATABASE_URL should start with postgresql://"
- Ensure the connection string uses the correct format
- Check for typos in the connection string



