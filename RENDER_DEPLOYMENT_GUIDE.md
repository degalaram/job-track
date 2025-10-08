# Daily Tracker - Render Deployment Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Render Setup](#render-setup)
3. [Environment Configuration](#environment-configuration)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites

Before deploying to Render, ensure you have:

- ✅ A GitHub account with this repository pushed
- ✅ A Render account (sign up at https://render.com)
- ✅ PostgreSQL database credentials (or use Render's built-in PostgreSQL)

---

## 2. Render Setup

### Step 1: Create PostgreSQL Database

1. **Log in to Render Dashboard**: https://dashboard.render.com
2. **Create New PostgreSQL Database**:
   - Click **"New +"** → Select **"PostgreSQL"**
   - **Name**: `daily-tracker-db`
   - **Database**: `daily_tracker`
   - **User**: Auto-generated (Render will provide)
   - **Region**: Choose closest to your users
   - **Plan**: Free tier is fine for testing
   - Click **"Create Database"**

3. **Copy Database Credentials**:
   - Once created, go to the database **"Info"** tab
   - Copy the **"Internal Database URL"** (starts with `postgresql://`)
   - Save this URL - you'll need it for the web service

---

## 3. Environment Configuration

### Step 2: Prepare Environment Variables

You'll need these environment variables for your Render web service:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/database_name

# Session Secret (Generate a random string)
SESSION_SECRET=your-super-secret-random-string-here-change-this

# Node Environment
NODE_ENV=production

# Port (Render sets this automatically, but you can specify)
PORT=10000
```

**⚠️ IMPORTANT**: 
- Generate a strong `SESSION_SECRET` using: `openssl rand -base64 32`
- Never commit these secrets to your repository

---

## 4. Deployment Steps

### Step 3: Create Web Service

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Create New Web Service**:
   - Click **"New +"** → Select **"Web Service"**
   - Connect your GitHub repository
   - Select the `daily-tracker` repository

3. **Configure Build Settings**:
   ```
   Name: daily-tracker-app
   Region: Same as your database
   Branch: main (or your production branch)
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   Plan: Free (or Starter for production)
   ```

4. **Add Environment Variables**:
   - Click **"Environment"** tab
   - Add each variable:
     - `DATABASE_URL` = (paste Internal Database URL from Step 1)
     - `SESSION_SECRET` = (your generated secret)
     - `NODE_ENV` = `production`

5. **Configure Advanced Settings** (Optional but Recommended):
   - **Health Check Path**: `/api/auth/check`
   - **Auto-Deploy**: Enabled (deploys on git push)

6. **Click "Create Web Service"**

### Step 4: Database Migration

After your web service is created:

1. **Open Shell** in Render dashboard:
   - Go to your web service
   - Click **"Shell"** tab
   - Run migration commands:
   ```bash
   npm run db:push
   ```

2. **Verify Database Tables**:
   - Go to your PostgreSQL database in Render
   - Click **"Query"** tab
   - Run: `SELECT * FROM users;`
   - Should show empty table (no errors)

---

## 5. Post-Deployment Configuration

### Step 5: Configure Session Storage

The app uses **FileStore** for session persistence, which works on Render:

1. **Verify Session Directory**:
   - Sessions are stored in `.sessions/` folder
   - Render persistent disk is recommended for production
   - Go to your web service → **"Settings"** → **"Disks"**
   - Add disk mount path: `.sessions` (size: 1GB is sufficient)

### Step 6: Test Your Deployment

1. **Access Your App**:
   - Your app URL: `https://daily-tracker-app.onrender.com`
   - Test registration: Create a new user account
   - Test login: Sign in with credentials
   - Test real-time sync: Open in 2 browser tabs, add a job/task in one tab

2. **Monitor Logs**:
   - Go to web service → **"Logs"** tab
   - Look for:
     - ✅ `Database connection initialized`
     - ✅ `serving on port 10000`
     - ✅ `WebSocket client connected`

---

## 6. Troubleshooting

### Common Issues & Solutions

#### ❌ Issue: "Database connection failed"
**Solution**:
```bash
# Check DATABASE_URL is correct
# Verify database is running in Render dashboard
# Ensure DATABASE_URL uses "Internal Database URL" (not External)
```

#### ❌ Issue: "Sessions not persisting"
**Solution**:
```bash
# Add persistent disk for .sessions folder
# Verify SESSION_SECRET is set
# Check session-file-store is installed: npm list session-file-store
```

#### ❌ Issue: "WebSocket connection failed"
**Solution**:
```bash
# Render supports WebSocket by default
# Ensure you're using wss:// (not ws://) in production
# Check client connection URL matches your Render domain
```

#### ❌ Issue: "Build fails"
**Solution**:
```bash
# Verify all dependencies in package.json
# Check Node version matches (use Node 18+)
# Review build logs in Render dashboard
```

#### ❌ Issue: "App crashes on startup"
**Solution**:
```bash
# Check environment variables are set
# Review logs for errors
# Ensure PORT is not hardcoded (use process.env.PORT)
```

---

## 7. Custom Domain (Optional)

### Step 7: Add Custom Domain

1. Go to your web service → **"Settings"** → **"Custom Domain"**
2. Click **"Add Custom Domain"**
3. Enter your domain: `tracker.yourdomain.com`
4. Add CNAME record to your DNS:
   ```
   Type: CNAME
   Name: tracker
   Value: daily-tracker-app.onrender.com
   ```
5. Wait for SSL certificate (automatic, ~5 minutes)

---

## 8. Production Checklist

Before going live, verify:

- [ ] Database is running and connected
- [ ] All environment variables are set
- [ ] SESSION_SECRET is strong and unique
- [ ] Health check endpoint is configured
- [ ] Auto-deploy is enabled (optional)
- [ ] Persistent disk for sessions is mounted
- [ ] SSL/HTTPS is working
- [ ] WebSocket connections work
- [ ] User registration/login works
- [ ] Real-time sync works across devices
- [ ] Password change functionality works

---

## 9. Monitoring & Maintenance

### Performance Monitoring
- Check **Metrics** tab for CPU/Memory usage
- Monitor response times in Logs
- Set up **Alerts** for downtime (Render dashboard)

### Database Backups
- Render PostgreSQL includes automatic backups
- Access backups: Database → **"Backups"** tab
- Manual backup: Use `pg_dump` from Shell

### Scaling (If Needed)
- Upgrade to Starter/Standard plan for:
  - Zero downtime deploys
  - Faster builds
  - More memory/CPU
  - Multiple instances

---

## 10. Cost Estimation

### Free Tier (Development/Testing)
- Web Service: Free (spins down after inactivity)
- PostgreSQL: Free (90 days, then $7/month)
- **Total**: $0/month (first 90 days)

### Production Tier (Recommended)
- Web Service: $7-25/month (Starter/Standard)
- PostgreSQL: $7/month (with backups)
- **Total**: $14-32/month

---

## 📞 Support Resources

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **WebSocket Support**: Render supports WebSocket natively
- **Node.js Guide**: https://render.com/docs/deploy-node-express-app

---

## ✅ Deployment Complete!

Your Daily Tracker app is now live on Render with:
- ✅ PostgreSQL database
- ✅ Persistent user sessions (30 days)
- ✅ Real-time WebSocket sync
- ✅ Secure authentication
- ✅ Auto-deploy on git push

**App URL**: https://daily-tracker-app.onrender.com

**Next Steps**: Share with users, monitor logs, and scale as needed!
