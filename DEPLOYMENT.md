# Deployment Guide for BridgePay

## Vercel Deployment

### Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Your GitHub repository connected to Vercel
3. Environment variables configured

### Step-by-Step Deployment

1. **Import Project in Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository: `HaloHealthAfrica/bridgepay`

2. **Configure Project Settings**
   - **Root Directory**: `create-anything/_/apps/web`
   - **Framework Preset**: Other (or leave blank)
   - **Build Command**: `npm run build`
   - **Output Directory**: Leave empty (React Router handles this)
   - **Install Command**: `npm install`

3. **Environment Variables**
   Add these in Vercel project settings → Environment Variables:
   
   **Required:**
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `AUTH_SECRET` - Generate with: `openssl rand -base64 32`
   
   **Optional (but recommended):**
   - `NODE_ENV` - Set to `production`
   - `CORS_ORIGINS` - Comma-separated list of allowed origins
   - `SKIP_CSRF_CHECK` - Set to `false` in production
   
   See `apps/docs/ENVIRONMENT.md` for complete list.

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `your-project.vercel.app`

### Troubleshooting

#### 404 Error

If you see a 404 error:

1. **Check Build Output**
   - Ensure `build/server/index.js` exists after build
   - Check Vercel build logs for errors

2. **Verify vercel.json**
   - Ensure `vercel.json` is in `apps/web/` directory
   - Check that `api/server.js` exists in `apps/web/api/`

3. **Check Root Directory**
   - In Vercel settings, ensure Root Directory is set to `create-anything/_/apps/web`
   - Not just `apps/web` or the repository root

4. **Verify Function Runtime**
   - Ensure Node.js version is 20.x
   - Check Vercel function logs for runtime errors

#### Build Errors

1. **Missing Dependencies**
   - Ensure `package.json` has all required dependencies
   - Check that `npm install` completes successfully

2. **Environment Variables**
   - Ensure all required env vars are set in Vercel
   - Check build logs for missing variable errors

3. **Database Connection**
   - Verify `DATABASE_URL` is correct
   - Ensure database allows connections from Vercel IPs

### Alternative Deployment Options

#### Railway
1. Connect GitHub repository
2. Set root directory to `create-anything/_/apps/web`
3. Set start command: `npm start`
4. Add environment variables

#### Render
1. Create new Web Service
2. Connect GitHub repository
3. Set root directory: `create-anything/_/apps/web`
4. Build command: `npm run build`
5. Start command: `npm start`

#### Self-Hosted (Docker)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY apps/web/package*.json ./
RUN npm install
COPY apps/web/ .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Post-Deployment

1. **Test Your Deployment**
   - Visit your deployed URL
   - Test signup/signin flows
   - Verify API endpoints work

2. **Set Up Custom Domain** (Optional)
   - In Vercel project settings → Domains
   - Add your custom domain
   - Configure DNS as instructed

3. **Monitor Logs**
   - Check Vercel function logs regularly
   - Set up error tracking (e.g., Sentry)

4. **Database Migrations**
   - Run migrations manually or via CI/CD
   - Ensure production database schema is up to date

## Support

For deployment issues:
- Check [Vercel Documentation](https://vercel.com/docs)
- Review [React Router v7 Deployment Guide](https://reactrouter.com/en/main/guides/deployment)
- Open an issue on GitHub

