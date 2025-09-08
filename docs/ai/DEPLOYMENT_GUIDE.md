# Deployment Guide

This guide covers deploying this project to Vercel with automatic CI/CD integration.

## 🚀 Vercel Deployment Setup

### Prerequisites
- GitHub repository with latest code pushed
- Vercel account connected to GitHub
- Supabase project with API keys

### Step 1: Import Project to Vercel

1. **Go to [vercel.com/new](https://vercel.com/new)**
2. **Sign in** with your GitHub account
3. **Import** this project's repository
4. **Vercel auto-detects** Vite configuration from `vercel.json`

### Step 2: Configure Environment Variables

In Vercel project settings, add these environment variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://szinijrajifovetkthcz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6aW5panJhamlmb3ZldGt0aGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDQzMzgsImV4cCI6MjA3Mjg4MDMzOH0.WSBn14JZZFUwf-zRoQDLNq30bP9nE7_ItB352znOBdk

# Monitoring
VITE_SENTRY_DSN=

# Build Environment
NODE_ENV=production
```

### Step 3: Deployment Configuration

The project includes optimized deployment configuration:

**`vercel.json`** features:
- ✅ Vite framework detection
- ✅ SPA routing with proper rewrites
- ✅ Asset caching headers (1 year cache)
- ✅ Environment variable mapping

**Build pipeline**:
- ✅ TypeScript compilation (`tsc -b`)
- ✅ Vite bundling and optimization
- ✅ SCSS compilation
- ✅ Asset compression and tree-shaking

## 🔄 Automatic Deployments

### Deployment Triggers

| Event | Result |
|-------|--------|
| Push to `master` | **Production deployment** to main domain |
| Push to feature branch | **Preview deployment** with unique URL |
| Pull request | **PR preview** for testing before merge |

### Build Process

1. **Vercel detects** GitHub push
2. **Installs dependencies** (`npm install`)
3. **Runs build** (`npm run build`)
4. **Deploys** `dist/` folder to global CDN
5. **Updates** live site (typically ~30 seconds)

### Build Commands

```bash
# Local development
npm run dev              # Start dev server

# Production builds
npm run build           # Standard build
npm run build:prod      # Build with linting + testing
npm run preview         # Test production build locally
```

## 🌐 Domain & URLs

### Production URL
- **Main site**: `https://your-project-name.vercel.app`
- **Custom domain**: Configure in Vercel dashboard

### Preview URLs
- **Feature branches**: `https://your-project-name-git-branch-name.vercel.app`
- **PR previews**: `https://your-project-name-pr-123.vercel.app`

## 🔧 Troubleshooting

### Common Issues

**Build Failures:**
- Check TypeScript errors: `npm run build` locally
- Verify environment variables are set in Vercel
- Review build logs in Vercel dashboard

**Runtime Errors:**
- Confirm Supabase connection in browser console
- Verify environment variables match local `.env.local`
- Check network requests in browser dev tools

**Performance Issues:**
- Assets are automatically optimized and cached
- SCSS is compiled and minified
- JavaScript is bundled and tree-shaken

### Environment Variable Security

- ✅ **VITE_** prefixed variables are safe for client-side
- ✅ Supabase anon key is designed for public exposure
- ✅ No server-side secrets in this configuration
- ⚠️ Never expose Supabase service key in client code

## 📊 Monitoring

### Vercel Analytics
- **Performance metrics** available in dashboard
- **Build logs** for debugging deployments
- **Function logs** (if using serverless functions)

### Application Monitoring
- **Supabase dashboard** for database metrics
- **Browser console** for client-side errors
- **Network tab** for API request monitoring

## 🚀 Next Steps

After successful deployment:

1. **Test live site** functionality
2. **Verify Supabase connection** works in production
3. **Set up custom domain** (optional)
4. **Configure branch protection** rules in GitHub
5. **Enable preview deployments** for team collaboration

The deployment pipeline is now ready for continuous development and automatic updates! 🎯
