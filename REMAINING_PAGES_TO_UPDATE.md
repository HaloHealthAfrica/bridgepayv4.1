# Remaining Pages to Update with New Design

## ✅ Already Updated (New .tsx files)
- `/page.tsx` - Landing page
- `/account/signin/page.tsx` - Sign in
- `/account/signup/page.tsx` - Sign up
- `/dashboard/page.tsx` - Main dashboard
- `/pay/page.tsx` - Pay page
- `/pay/success/[id]/page.tsx` - Payment success
- `/payments/receipt/[id]/page.tsx` - Payment receipt
- `/payments/intent/[id]/page.tsx` - Payment intent
- `/invoices/new/page.tsx` - Create invoice
- `/i/[id]/page.tsx` - Invoice view
- `/i/[id]/success/page.tsx` - Invoice success
- `/payment-links/page.tsx` - Payment links list
- `/payment-links/create/page.tsx` - Create payment link
- `/merchant/dashboard/page.tsx` - Merchant dashboard
- `/merchant/withdraw/page.tsx` - Merchant withdraw
- `/implementer/dashboard/page.tsx` - Implementer dashboard
- `/implementer/projects/[id]/submit-evidence/page.tsx` - Submit evidence
- `/kyc-verifier/dashboard/page.tsx` - KYC verifier dashboard
- `/kyc-verifier/review/[id]/page.tsx` - KYC review
- `/project-verifier/dashboard/page.tsx` - Project verifier dashboard
- `/admin/page.tsx` - Admin dashboard
- `/admin/users/page.tsx` - Admin user management
- `/wallet/page.tsx` - Wallet dashboard
- `/wallet/add-money/page.tsx` - Add money
- `/wallet/send-money/page.tsx` - Send money
- `/wallet/history/page.tsx` - Transaction history
- `/wallet/qr-pay/page.tsx` - QR pay
- `/projects/page.tsx` - Projects list
- `/projects/[id]/page.tsx` - Project detail
- `/projects/create/page.tsx` - Create project
- `/projects/[id]/fund/page.tsx` - Fund project

## ❌ Still Need Updates (Old .jsx files)

### Payment Pages
1. ❌ `/payments/scheduled/page.jsx` - Scheduled payments
2. ❌ `/payments/split/page.jsx` - Split payment
3. ❌ `/pay/link/[code]/page.jsx` - Payment link public page

### Merchant Pages
4. ❌ `/merchant/invoices/page.jsx` - Merchant invoices list
5. ❌ `/merchant/invoices/[id]/page.jsx` - Merchant invoice detail
6. ❌ `/merchant/refunds/page.jsx` - Merchant refunds
7. ❌ `/merchant/billing/page.jsx` - Merchant billing
8. ❌ `/merchant/shopping/page.jsx` - Merchant shopping

### QR Code Pages
9. ❌ `/qr/page.jsx` - QR code page
10. ❌ `/qr-payment/page.jsx` - QR payment
11. ❌ `/q/[code]/page.jsx` - QR scan/view

### Admin Pages
12. ❌ `/admin/billing/catalog/page.jsx` - Billing catalog
13. ❌ `/admin/billing/ledger/page.jsx` - Billing ledger
14. ❌ `/admin/disputes/page.jsx` - Disputes
15. ❌ `/admin/diagnostics/page.jsx` - Diagnostics
16. ❌ `/admin/payments/page.jsx` - Payments admin
17. ❌ `/admin/payments/test-harness/page.jsx` - Test harness
18. ❌ `/admin/wallet/ledger/page.jsx` - Wallet ledger
19. ❌ `/admin/wallet/sessions/page.jsx` - Wallet sessions
20. ❌ `/admin/wallet/webhooks/page.jsx` - Wallet webhooks
21. ❌ `/admin/wallet/withdrawals/page.jsx` - Wallet withdrawals
22. ❌ `/admin/webhooks/page.jsx` - Webhooks

### Account Pages
23. ❌ `/account/logout/page.jsx` - Logout page
24. ❌ `/account/dev-admin/page.jsx` - Dev admin page

### Duplicate/Old Pages (Can be deleted)
25. ❌ `/wallet/page.jsx` - Old wallet page (duplicate of .tsx)
26. ❌ `/wallet/topup/page.jsx` - Old topup page
27. ❌ `/wallet/transfer/page.jsx` - Old transfer page
28. ❌ `/wallet/withdraw/page.jsx` - Old withdraw page
29. ❌ `/projects/page.jsx` - Old projects page (duplicate of .tsx)
30. ❌ `/projects/[id]/page.jsx` - Old project detail (duplicate of .tsx)
31. ❌ `/payment-links/page.jsx` - Old payment links (duplicate of .tsx)
32. ❌ `/payment-links/create/page.jsx` - Old create link (duplicate of .tsx)
33. ❌ `/pay/success/[id]/page.jsx` - Old success page (duplicate of .tsx)
34. ❌ `/pay/page.jsx` - Old pay page (duplicate of .tsx)
35. ❌ `/payments/receipt/[id]/page.jsx` - Old receipt (duplicate of .tsx)
36. ❌ `/payments/intent/[id]/page.jsx` - Old intent (duplicate of .tsx)
37. ❌ `/invoices/new/page.jsx` - Old invoice create (duplicate of .tsx)
38. ❌ `/i/[id]/page.jsx` - Old invoice view (duplicate of .tsx)
39. ❌ `/i/[id]/success/page.jsx` - Old invoice success (duplicate of .tsx)
40. ❌ `/dashboard/page.jsx` - Old dashboard (duplicate of .tsx)
41. ❌ `/page.jsx` - Old landing page (duplicate of .tsx)
42. ❌ `/account/signin/page.jsx` - Old signin (duplicate of .tsx)
43. ❌ `/account/signup/page.jsx` - Old signup (duplicate of .tsx)
44. ❌ `/admin/page.jsx` - Old admin page (duplicate of .tsx)

## Summary

**Total Pages Needing Updates: 24 unique pages**
- 3 Payment feature pages
- 5 Merchant pages
- 3 QR code pages
- 11 Admin pages
- 2 Account pages

**Total Duplicate Pages to Clean Up: 20 old .jsx files**

## Priority Order

### High Priority (User-Facing)
1. Payment scheduled & split pages
2. Payment link public page
3. QR code pages
4. Merchant invoices & refunds

### Medium Priority
5. Merchant billing & shopping
6. Account pages (logout, dev-admin)

### Lower Priority (Admin)
7. All admin pages (can be done last)

