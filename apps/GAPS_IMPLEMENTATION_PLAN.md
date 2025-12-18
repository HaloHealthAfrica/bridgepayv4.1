# Gaps Implementation Plan

Sequential implementation plan for gaps 1-5 from the use case review, using multi-agent workflows where applicable.

## Gap 1: Email/SMS Notifications System

**Status**: ⚠️ Currently disabled (`email_disabled` in invoice send endpoint)

**Scope**:
- Email notifications for invoices, payments, wallet transactions
- SMS notifications (optional, via Twilio/AfricasTalking)
- Email templates system
- Notification preferences per user
- Queue-based async notification sending

**Multi-Agent Workflow**:
1. **Agent 1: Email Service Infrastructure**
   - Set up email service (Resend/SendGrid/Nodemailer)
   - Create email template system
   - Implement email queue worker
   - Add email configuration to environment

2. **Agent 2: SMS Service Integration** (Optional)
   - Integrate SMS provider (Twilio/AfricasTalking)
   - Create SMS template system
   - Add SMS queue worker

3. **Agent 3: Notification Service Layer**
   - Create notification service abstraction
   - Implement notification preferences
   - Add notification history tracking
   - Integrate with existing flows (invoices, payments, wallet)

**Files to Create/Modify**:
- `lib/notifications/email.js` - Email service
- `lib/notifications/sms.js` - SMS service
- `lib/notifications/templates.js` - Email/SMS templates
- `lib/queue/notificationQueue.js` - Notification queue
- `web/src/app/api/notifications/preferences/route.js` - User preferences
- `web/src/app/api/invoices/[id]/send/route.js` - Enable email sending
- `database/migrations/002_notifications.sql` - Notification tables

**Estimated Time**: 3-4 days

---

## Gap 2: Project Funding Flow

**Status**: ⚠️ Projects exist but no funding/contribution mechanism

**Scope**:
- Project contribution/payment flow
- Update project `current_amount` on payment
- Project contribution history
- Project funding notifications
- Project completion logic (when target reached)

**Multi-Agent Workflow**:
1. **Agent 1: Project Funding API**
   - Create `/api/projects/[id]/contribute` endpoint
   - Integrate with payment intent system
   - Update project `current_amount` on successful payment
   - Add contribution tracking table

2. **Agent 2: Project Funding UI**
   - Add "Contribute" button to project detail page
   - Create contribution modal/form
   - Show contribution history
   - Display progress updates

3. **Agent 3: Project Completion Logic**
   - Auto-complete project when target reached
   - Send notifications to project owner
   - Handle project status transitions

**Files to Create/Modify**:
- `web/src/app/api/projects/[id]/contribute/route.js` - Contribution endpoint
- `web/src/app/api/projects/[id]/contributions/route.js` - Contribution history
- `web/src/app/projects/[id]/page.jsx` - Project detail page with funding
- `database/migrations/003_project_contributions.sql` - Contributions table
- `web/src/app/api/projects/[id]/complete/route.js` - Auto-completion logic

**Estimated Time**: 2-3 days

---

## Gap 3: Mobile App Features

**Status**: ⚠️ Structure exists but no features implemented

**Scope**:
- Authentication flow
- Wallet dashboard
- Payment creation
- QR code scanning
- Transaction history
- Invoice viewing/payment

**Multi-Agent Workflow**:
1. **Agent 1: Mobile Authentication & Core Setup**
   - Complete auth flow (signup, login, logout)
   - Set up navigation structure
   - Create shared components
   - Integrate with API token endpoint

2. **Agent 2: Wallet Features**
   - Wallet balance view
   - Transaction history
   - Top-up flow
   - Transfer flow

3. **Agent 3: Payment Features**
   - Payment intent creation
   - QR code scanning
   - Payment history
   - Invoice viewing

4. **Agent 4: Mobile-Specific Features**
   - Push notifications setup
   - Offline data caching
   - Biometric authentication (optional)

**Files to Create/Modify**:
- `mobile/src/app/(auth)/signin.jsx` - Sign in screen
- `mobile/src/app/(auth)/signup.jsx` - Sign up screen
- `mobile/src/app/(tabs)/wallet.jsx` - Wallet screen
- `mobile/src/app/(tabs)/payments.jsx` - Payments screen
- `mobile/src/app/(tabs)/invoices.jsx` - Invoices screen
- `mobile/src/components/WalletCard.jsx` - Wallet component
- `mobile/src/components/TransactionList.jsx` - Transaction list
- `mobile/src/utils/api.js` - API client

**Estimated Time**: 5-7 days

---

## Gap 4: Advanced Analytics & Reporting

**Status**: ⚠️ Basic metrics exist, no advanced reporting

**Scope**:
- Advanced revenue analytics
- Transaction trends
- User behavior analytics
- Exportable reports (CSV, PDF)
- Custom date ranges
- Dashboard widgets

**Multi-Agent Workflow**:
1. **Agent 1: Analytics Data Layer**
   - Create analytics aggregation queries
   - Build time-series data collection
   - Add analytics caching layer
   - Create analytics database views

2. **Agent 2: Analytics API Endpoints**
   - Revenue trends endpoint
   - Transaction analytics endpoint
   - User behavior endpoint
   - Custom date range filtering

3. **Agent 3: Reporting & Export**
   - CSV export functionality
   - PDF report generation
   - Scheduled report generation
   - Report templates

4. **Agent 4: Analytics Dashboard UI**
   - Advanced charts (Recharts integration)
   - Date range picker
   - Export buttons
   - Customizable widgets

**Files to Create/Modify**:
- `web/src/app/api/analytics/revenue/route.js` - Revenue analytics
- `web/src/app/api/analytics/transactions/route.js` - Transaction analytics
- `web/src/app/api/analytics/export/route.js` - Export endpoint
- `web/src/app/admin/analytics/page.jsx` - Analytics dashboard
- `lib/analytics/aggregator.js` - Analytics aggregation logic
- `lib/reports/generator.js` - Report generation

**Estimated Time**: 4-5 days

---

## Gap 5: Multi-Currency Support

**Status**: ⚠️ Hardcoded to KES in many places

**Scope**:
- Currency selection in UI
- Currency conversion service
- Multi-currency wallet support
- Currency-aware payment processing
- Exchange rate management
- Currency conversion fees

**Multi-Agent Workflow**:
1. **Agent 1: Currency Infrastructure**
   - Create currency service
   - Add exchange rate API integration (OpenExchangeRates/CurrencyAPI)
   - Create currency conversion utilities
   - Add exchange rate caching

2. **Agent 2: Multi-Currency Database Updates**
   - Update wallet queries to support multiple currencies
   - Add currency conversion tracking
   - Update payment intents to handle currency
   - Add exchange rate history table

3. **Agent 3: Currency UI Components**
   - Currency selector component
   - Currency display formatting
   - Exchange rate display
   - Currency conversion calculator

4. **Agent 4: Payment Processing Updates**
   - Update payment intents for multi-currency
   - Add currency conversion in payment flow
   - Update billing/fees for currency
   - Handle currency conversion fees

**Files to Create/Modify**:
- `lib/currency/service.js` - Currency service
- `lib/currency/converter.js` - Currency conversion
- `lib/currency/exchangeRates.js` - Exchange rate management
- `web/src/app/api/currency/rates/route.js` - Exchange rates endpoint
- `web/src/components/CurrencySelector.jsx` - Currency selector
- `database/migrations/004_currency_support.sql` - Currency tables
- Update all hardcoded "KES" references

**Estimated Time**: 5-6 days

---

## Implementation Order

**Week 1:**
- Day 1-2: Gap 1 (Email/SMS Notifications) - Agent 1 & 2
- Day 3-4: Gap 1 (Email/SMS Notifications) - Agent 3
- Day 5: Gap 2 (Project Funding) - Agent 1

**Week 2:**
- Day 1-2: Gap 2 (Project Funding) - Agent 2 & 3
- Day 3-5: Gap 3 (Mobile App) - Agent 1 & 2

**Week 3:**
- Day 1-3: Gap 3 (Mobile App) - Agent 3 & 4
- Day 4-5: Gap 4 (Advanced Analytics) - Agent 1 & 2

**Week 4:**
- Day 1-2: Gap 4 (Advanced Analytics) - Agent 3 & 4
- Day 3-5: Gap 5 (Multi-Currency) - Agent 1 & 2

**Week 5:**
- Day 1-3: Gap 5 (Multi-Currency) - Agent 3 & 4
- Day 4-5: Testing & Documentation

---

## Success Criteria

### Gap 1: Email/SMS Notifications
- ✅ Invoices can be sent via email
- ✅ Payment notifications sent
- ✅ Wallet transaction notifications sent
- ✅ User can manage notification preferences
- ✅ Notifications queued and processed asynchronously

### Gap 2: Project Funding
- ✅ Users can contribute to projects
- ✅ Project `current_amount` updates on payment
- ✅ Contribution history visible
- ✅ Project auto-completes when target reached
- ✅ Project owner receives notifications

### Gap 3: Mobile App
- ✅ Users can sign up/login on mobile
- ✅ Wallet features work on mobile
- ✅ Payments can be created on mobile
- ✅ QR codes can be scanned
- ✅ Transaction history accessible

### Gap 4: Advanced Analytics
- ✅ Revenue trends visible
- ✅ Transaction analytics available
- ✅ Reports can be exported (CSV/PDF)
- ✅ Custom date ranges supported
- ✅ Dashboard shows advanced metrics

### Gap 5: Multi-Currency
- ✅ Users can select currency
- ✅ Currency conversion works
- ✅ Multi-currency wallets supported
- ✅ Payments handle currency conversion
- ✅ Exchange rates cached and updated

---

## Dependencies

**Gap 1 (Notifications)**:
- Email service account (Resend/SendGrid)
- Optional: SMS service account (Twilio/AfricasTalking)
- Redis (for notification queue)

**Gap 2 (Project Funding)**:
- Payment intent system (already exists)
- Billing system (already exists)

**Gap 3 (Mobile App)**:
- Expo development environment
- Mobile device/emulator for testing

**Gap 4 (Analytics)**:
- Recharts library (already in dependencies)
- PDF generation library (jsPDF or similar)

**Gap 5 (Multi-Currency)**:
- Exchange rate API (OpenExchangeRates/CurrencyAPI)
- API key for exchange rate service

---

## Notes

- Each gap can be implemented independently
- Multi-agent workflows allow parallel work on different aspects
- Testing should be done after each gap completion
- Documentation should be updated as features are added
- Environment variables need to be documented for new services


