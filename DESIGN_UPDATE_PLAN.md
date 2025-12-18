# Design Update Plan - Remaining Pages

## Design System Standards
- **Primary Color**: `#00796B` (Deep Teal)
- **Primary Light**: `#E0F2F1`
- **Background**: `#F5F5F5`
- **Surface**: `#FFFFFF`
- **Text**: `#212121`
- **Text Secondary**: `#757575`
- **Border Radius**: `16px` (card), `12px` (buttons/inputs)
- **Border**: `1px solid #E0E0E0`
- **Components**: Navigation, Button, StatusPill, StatCard, QuickAction

## Update Priority & Order

### Phase 1: Core/Account Pages (Foundation)
1. ✅ Landing page (`/page.jsx`)
2. ✅ Sign in page (`/account/signin/page.jsx`)
3. ✅ Sign up page (`/account/signup/page.jsx`)
4. ✅ Main Dashboard (`/dashboard/page.jsx`)

### Phase 2: Payment Pages
5. ✅ Pay page (`/pay/page.jsx`)
6. ✅ Payment success (`/pay/success/[id]/page.jsx`)
7. ✅ Payment intent (`/payments/intent/[id]/page.jsx`)
8. ✅ Payment receipt (`/payments/receipt/[id]/page.jsx`)
9. ✅ Scheduled payments (`/payments/scheduled/page.jsx`)
10. ✅ Split payment (`/payments/split/page.jsx`)

### Phase 3: Invoice Pages
11. ✅ Create invoice (`/invoices/new/page.jsx`)
12. ✅ Invoice view (`/i/[id]/page.jsx`)
13. ✅ Invoice success (`/i/[id]/success/page.jsx`)

### Phase 4: Merchant Pages
14. ✅ Merchant invoices list (`/merchant/invoices/page.jsx`)
15. ✅ Merchant invoice detail (`/merchant/invoices/[id]/page.jsx`)
16. ✅ Merchant refunds (`/merchant/refunds/page.jsx`)
17. ✅ Merchant billing (`/merchant/billing/page.jsx`)
18. ✅ Merchant shopping (`/merchant/shopping/page.jsx`)

### Phase 5: Payment Links & QR
19. ✅ Payment links list (`/payment-links/page.jsx`)
20. ✅ Create payment link (`/payment-links/create/page.jsx`)
21. ✅ QR code page (`/qr/page.jsx`)
22. ✅ QR payment (`/qr-payment/page.jsx`)
23. ✅ QR scan (`/q/[code]/page.jsx`)

### Phase 6: Admin Pages
24. ✅ Admin billing catalog (`/admin/billing/catalog/page.jsx`)
25. ✅ Admin billing ledger (`/admin/billing/ledger/page.jsx`)
26. ✅ Admin disputes (`/admin/disputes/page.jsx`)
27. ✅ Admin diagnostics (`/admin/diagnostics/page.jsx`)
28. ✅ Admin payments (`/admin/payments/page.jsx`)
29. ✅ Admin wallet management pages

### Phase 7: Cleanup
30. ✅ Remove duplicate old pages (wallet/page.jsx, projects/page.jsx, etc.)

## Implementation Guidelines
- Use Navigation component for all authenticated pages
- Use Button component with variants (primary/secondary/danger)
- Use StatusPill for status indicators
- Use StatCard for dashboard metrics
- Use formatCurrency utility for all currency displays
- Maintain existing API routes and backend logic
- Use Tailwind classes matching design system
- Ensure responsive design (mobile-first)

