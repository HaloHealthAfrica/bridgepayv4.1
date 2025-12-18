# Bridge MVP v3

A full-stack payment platform providing wallet management, payment processing, invoicing, QR payments, and merchant shopping capabilities. Built with React Router v7 (web) and Expo/React Native (mobile), integrated with Stripe and custom payment gateways.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** database (Neon, Supabase, or self-hosted)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd create-anything/_/apps
   ```

2. **Set up environment variables**
   ```bash
   # Copy environment template (create manually if needed)
   # See docs/ENVIRONMENT.md for all required variables
   
   # Required variables:
   DATABASE_URL=postgresql://user:password@host:port/database
   AUTH_SECRET=<generate-with-openssl-rand-base64-32>
   ```

3. **Install dependencies**
   ```bash
   # Web app
   cd web
   npm install
   
   # Mobile app (optional)
   cd ../mobile
   npm install
   ```

4. **Set up database**
   ```bash
   # Run migrations
   psql $DATABASE_URL -f database/migrations/001_initial_schema.sql
   
   # Or use the seed script for development
   node database/seeds/dev.js
   ```

5. **Start development server**
   ```bash
   cd web
   npm run dev
   ```

6. **Access the application**
   - Web: http://localhost:4000
   - Sign up at `/account/signup`
   - Sign in at `/account/signin`

## 📚 Documentation

- **[Development Guide](docs/DEVELOPMENT.md)** - Local setup, workflow, and contributing
- **[API Documentation](docs/API.md)** - Complete API reference
- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design and architecture
- **[Environment Variables](docs/ENVIRONMENT.md)** - Configuration guide
- **[Testing Guide](docs/TESTING.md)** - How to write and run tests
- **[Error Handling](docs/ERROR_HANDLING.md)** - Error handling patterns
- **[Security](docs/SECURITY.md)** - Security measures and best practices
- **[Database Schema](database/README.md)** - Database structure and relationships

## 🏗️ Architecture

### Tech Stack

**Web Application**
- **Framework**: React Router v7 with SSR
- **Server**: Hono (lightweight web framework)
- **Database**: PostgreSQL (Neon serverless)
- **Auth**: Custom Auth.js with credentials provider
- **Styling**: Tailwind CSS
- **State Management**: Zustand, TanStack Query

**Mobile Application**
- **Framework**: Expo 54, React Native 0.81.4
- **Navigation**: Expo Router
- **State Management**: Zustand, TanStack Query

**Payment Processing**
- **Stripe**: Card payments
- **Lemonade Gateway**: M-Pesa and mobile money integration
- **Multi-source funding**: Wallet, M-Pesa, bank transfers

### Key Features

1. **Wallet System**
   - Multi-currency support (KES primary)
   - Top-up and withdrawal
   - Double-entry ledger
   - Virtual payment sources

2. **Payment Processing**
   - Payment intents with multi-source funding
   - QR code payments
   - Split payments
   - Scheduled/recurring payments
   - Escrow services

3. **Merchant Features**
   - Invoice creation and management
   - Product catalog
   - Order management
   - Refund processing
   - Billing and fee calculation

4. **Admin Dashboard**
   - Revenue tracking
   - Payment monitoring
   - Dispute management
   - System diagnostics

## 📁 Project Structure

```
apps/
├── web/                    # Web application
│   ├── src/
│   │   ├── app/           # React Router routes
│   │   │   ├── api/       # API routes (Hono)
│   │   │   └── ...
│   │   ├── auth.js        # Auth.js configuration
│   │   └── ...
│   ├── __create/          # Server entry point
│   └── package.json
├── mobile/                 # Mobile application
│   ├── src/
│   └── package.json
├── database/              # Database schema and migrations
│   ├── schema.sql
│   ├── migrations/
│   └── seeds/
├── docs/                  # Documentation
├── scripts/               # Utility scripts
└── README.md
```

## 🧪 Testing

```bash
# Run tests
cd web
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

See [Testing Guide](docs/TESTING.md) for more information.

## 🔒 Security

- CSRF protection enabled
- Password strength requirements
- Secure session management
- Admin-only debug endpoints
- Audit logging

See [Security Documentation](docs/SECURITY.md) for details.

## 🛠️ Development

### Available Scripts

**Web App**
- `npm run dev` - Start development server
- `npm test` - Run tests
- `npm run typecheck` - TypeScript type checking
- `npm run validate-env` - Validate environment variables

**Mobile App**
- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS

### Development Workflow

1. Create a feature branch
2. Make changes
3. Write/update tests
4. Run tests and type checking
5. Submit pull request

See [Development Guide](docs/DEVELOPMENT.md) for detailed workflow.

## 📊 Project Status

**Phase 1: Critical Fixes** ✅ Complete
- Database schema documentation
- Environment configuration
- Security fixes
- Missing API routes

**Phase 2: High-Priority Gaps** ✅ Complete
- ✅ Error handling standardization
- ✅ Basic testing infrastructure
- ✅ Documentation

**Phase 3: Resilience Patterns** ✅ Complete
- ✅ Message queue for async processing
- ✅ Circuit breakers
- ✅ Redis caching
- ✅ Health checks

**All Phases Complete!** 🎉

See [PROGRESS.md](PROGRESS.md) for detailed progress tracking.

## 🤝 Contributing

1. Read the [Development Guide](docs/DEVELOPMENT.md)
2. Follow the code style and conventions
3. Write tests for new features
4. Update documentation as needed
5. Submit pull requests with clear descriptions

## 📝 License

[Add your license here]

## 🆘 Support

- **Documentation**: See `docs/` directory
- **Issues**: [GitHub Issues](link-to-issues)
- **Questions**: [Discussions](link-to-discussions)

## 🙏 Acknowledgments

- React Router team for the excellent framework
- Expo team for mobile development tools
- All contributors and maintainers

---

**Built with ❤️ for seamless payment processing**

