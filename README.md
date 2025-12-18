# BridgePay - Payment Platform

A full-stack payment platform providing wallet management, payment processing, invoicing, QR payments, and merchant shopping capabilities.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** database (Neon, Supabase, or self-hosted)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/HaloHealthAfrica/bridgepay.git
   cd bridgepay/create-anything/_/apps/web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create a .env file with required variables
   # See apps/docs/ENVIRONMENT.md for all required variables
   
   DATABASE_URL=postgresql://user:password@host:port/database
   AUTH_SECRET=<generate-with-openssl-rand-base64-32>
   ```

4. **Set up database**
   ```bash
   # Run migrations
   psql $DATABASE_URL -f ../database/migrations/001_initial_schema.sql
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Web: http://localhost:4000
   - Sign up at `/account/signup`
   - Sign in at `/account/signin`

## 📚 Documentation

See [apps/README.md](apps/README.md) for complete documentation.

## 🚀 Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import your repository in Vercel
3. Set the following in Vercel project settings:
   - **Root Directory**: `create-anything/_/apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: Leave empty (React Router handles this)
   - **Install Command**: `npm install`

4. Add environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - Other required variables (see `apps/docs/ENVIRONMENT.md`)

5. Deploy!

The `vercel.json` file in `apps/web/` is configured for React Router v7 with SSR.

## 📝 License

[Add your license here]

## 🆘 Support

- **Documentation**: See `apps/docs/` directory
- **Issues**: [GitHub Issues](https://github.com/HaloHealthAfrica/bridgepay/issues)

---

**Built with ❤️ for seamless payment processing**

