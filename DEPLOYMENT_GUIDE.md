# Worker WageBook - Deployment Guide

**Version**: 1.0  
**Last Updated**: 2026-10-18  
**Status**: Production Ready

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Web Deployment](#web-deployment)
3. [Android Deployment](#android-deployment)
4. [iOS Deployment](#ios-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Backup Strategy](#database-backup-strategy)
7. [Monitoring & Logging](#monitoring--logging)
8. [Update Strategy](#update-strategy)
9. [Rollback Procedures](#rollback-procedures)

---

## Pre-Deployment Checklist

Complete all items before deploying to production:

### Code Quality ✅
- [ ] TypeScript compilation passes with 0 errors (`npx tsc --noEmit`)
- [ ] All unit tests pass
- [ ] No console errors or warnings
- [ ] Code review completed
- [ ] All TODO comments resolved

### Testing ✅
- [ ] All manual tests pass (see TESTING_GUIDE.md)
- [ ] Business logic verified
- [ ] Edge cases tested
- [ ] Performance acceptable
- [ ] Security tests pass

### Documentation ✅
- [ ] README.md up to date
- [ ] All features documented
- [ ] Known limitations documented
- [ ] User guide created (if needed)

### Configuration ✅
- [ ] Business profile configured
- [ ] Salary calculation rules set
- [ ] Categories created
- [ ] PIN lock enabled
- [ ] Backup strategy defined

### Legal & Compliance ✅
- [ ] Privacy policy created (if required)
- [ ] Terms of service created (if required)
- [ ] Data retention policy defined
- [ ] GDPR compliance (if applicable)

---

## Web Deployment

### Option 1: Static Hosting (Recommended)

Deploy the web version to any static hosting service.

#### Build for Production

```bash
cd worker-wagebook

# Export for web
npx expo export --platform web

# Output will be in dist/ directory
```

#### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Configuration:**
- Framework Preset: Expo
- Build Command: `npx expo export --platform web`
- Output Directory: `dist`
- Install Command: `npm install`

#### Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
npx expo export --platform web

# Deploy
netlify deploy --prod --dir=dist
```

#### Deploy to GitHub Pages

```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts:
# "deploy": "npx expo export --platform web && gh-pages -d dist"

# Deploy
npm run deploy
```

#### Deploy to AWS S3 + CloudFront

```bash
# Build
npx expo export --platform web

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Option 2: Docker Deployment

Create a Dockerfile:

```dockerfile
FROM node:20-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npx expo export --platform web

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create nginx.conf:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

Build and run:

```bash
docker build -t worker-wagebook .
docker run -p 8080:80 worker-wagebook
```

---

## Android Deployment

### Prerequisites

- [ ] Expo account (https://expo.dev)
- [ ] EAS CLI installed (`npm install -g eas-cli`)
- [ ] Google Play Console account ($25 one-time fee)
- [ ] Android keystore for signing

### Build with EAS

#### Configure EAS

```bash
cd worker-wagebook

# Login to Expo
eas login

# Configure build
eas build:configure
```

This creates `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

#### Build APK (for testing)

```bash
# Build preview APK
eas build --platform android --profile preview

# Download APK from Expo dashboard
# Install on device for testing
```

#### Build AAB (for Play Store)

```bash
# Build production AAB
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --profile production
```

### Manual Play Store Submission

1. **Create App in Play Console**
   - Go to Google Play Console
   - Create new app
   - Fill in app details

2. **Prepare Store Listing**
   - App name: Worker WageBook
   - Short description (80 chars): Manage worker wages, attendance, and advances
   - Full description (4000 chars): Detailed feature list
   - Screenshots (min 2, max 8)
   - Feature graphic (1024x500)
   - Icon (512x512)

3. **Upload AAB**
   - Go to Production → Create new release
   - Upload AAB file from EAS build
   - Fill in release notes

4. **Set Pricing & Distribution**
   - Free or Paid
   - Countries
   - Target audience

5. **Submit for Review**
   - Complete content rating questionnaire
   - Submit for review (takes 1-7 days)

---

## iOS Deployment

### Prerequisites

- [ ] Apple Developer account ($99/year)
- [ ] EAS CLI installed
- [ ] macOS (for local builds) or EAS Build (cloud)

### Build with EAS

```bash
# Build for iOS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production
```

### Manual App Store Submission

1. **Create App in App Store Connect**
   - Go to App Store Connect
   - Create new app
   - Fill in app details

2. **Prepare Store Listing**
   - App name: Worker WageBook
   - Subtitle (30 chars): Worker wage management
   - Description (4000 chars)
   - Screenshots (min 1 per device size)
   - Preview video (optional)

3. **Upload Build**
   - Use EAS Submit or Transporter app
   - Select build in App Store Connect

4. **Set Pricing & Availability**
   - Free or Paid
   - Countries

5. **Submit for Review**
   - Complete app review information
   - Submit for review (takes 1-3 days)

---

## Environment Configuration

### Production Environment Variables

Create `.env.production`:

```bash
# App Configuration
APP_NAME=Worker WageBook
APP_VERSION=1.0.0
APP_ENV=production

# Database (if using remote database)
DATABASE_URL=your_database_url

# Backup Configuration (if using cloud backup)
GOOGLE_DRIVE_CLIENT_ID=your_client_id
GOOGLE_DRIVE_API_KEY=your_api_key

# Analytics (optional)
ANALYTICS_ID=your_analytics_id

# Error Tracking (optional)
SENTRY_DSN=your_sentry_dsn
```

### App Configuration

Update `app.json` for production:

```json
{
  "expo": {
    "name": "Worker WageBook",
    "slug": "worker-wagebook",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.workerwagebook",
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourcompany.workerwagebook",
      "versionCode": 1
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

---

## Database Backup Strategy

### Local SQLite Backup

The app uses local SQLite database. Implement backup strategy:

#### Manual Backup (Current)

Users can export data via Settings → Export All Data (CSV)

#### Automated Backup (Future Enhancement)

```typescript
// Example: Daily backup to Google Drive
async function automatedBackup() {
  const lastBackup = await settingsService.getLastBackupDate();
  const daysSinceBackup = daysBetween(lastBackup, new Date());
  
  if (daysSinceBackup >= 1) {
    const backupData = await exportAllData();
    await uploadToGoogleDrive(backupData);
    await settingsService.setLastBackupDate(new Date());
  }
}
```

#### Backup Schedule Recommendations

- **Daily**: Automatic backup at 2 AM
- **Weekly**: Full backup with verification
- **Monthly**: Archive backup to cold storage

### Backup Verification

Regularly verify backups:

1. Export data to CSV
2. Import into test environment
3. Verify data integrity
4. Check all relationships intact

---

## Monitoring & Logging

### Error Tracking

Add Sentry for error tracking:

```bash
npm install @sentry/react-native
```

Initialize in App.tsx:

```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: __DEV__ ? 'development' : 'production',
});
```

### Analytics

Add analytics to track usage:

```bash
npm install expo-analytics-amplitude
```

Track key events:

```typescript
import { Analytics } from 'expo-analytics-amplitude';

Analytics.initialize('YOUR_API_KEY');

// Track events
Analytics.track('worker_created', { category: 'Mason' });
Analytics.track('salary_settled', { amount: 3000 });
Analytics.track('report_exported', { type: 'pdf' });
```

### Performance Monitoring

Monitor app performance:

```typescript
// Track load times
const startTime = Date.now();
await loadData();
const loadTime = Date.now() - startTime;

if (loadTime > 3000) {
  Sentry.captureMessage(`Slow load: ${loadTime}ms`);
}
```

---

## Update Strategy

### Version Numbering

Follow semantic versioning:

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features
- **Patch** (1.0.0 → 1.0.1): Bug fixes

### Update Process

#### Web Updates

```bash
# Build new version
npx expo export --platform web

# Deploy to hosting
vercel --prod

# Users get update on next page load
```

#### Mobile Updates (OTA)

For minor updates, use EAS Update:

```bash
# Configure EAS Update
eas update:configure

# Publish update
eas update --branch production --message "Bug fixes"

# Users get update on next app launch
```

#### Mobile Updates (Store)

For major updates:

```bash
# Increment version in app.json
# "version": "1.1.0"

# Build new version
eas build --platform all --profile production

# Submit to stores
eas submit --platform all --profile production
```

### Database Migrations

When updating database schema:

```typescript
// In database.ts
async function migrateDatabase() {
  const currentVersion = await getDatabaseVersion();
  
  if (currentVersion < 2) {
    await migrateToV2();
  }
  
  if (currentVersion < 3) {
    await migrateToV3();
  }
}
```

---

## Rollback Procedures

### Web Rollback

#### Vercel

```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote DEPLOYMENT_URL
```

#### Netlify

```bash
# Go to Netlify dashboard
# Deploys → Select previous deploy → Publish
```

### Mobile Rollback

#### OTA Rollback

```bash
# Rollback to previous update
eas update:rollback --branch production
```

#### Store Rollback

**Android:**
- Go to Play Console
- Release → Rollback to previous release

**iOS:**
- Go to App Store Connect
- Submit previous version as new release

### Database Rollback

If migration fails:

```sql
-- Restore from backup
-- 1. Stop app
-- 2. Restore SQLite file from backup
-- 3. Restart app
```

---

## Post-Deployment Checklist

After deploying to production:

- [ ] Verify app loads correctly
- [ ] Test all critical features
- [ ] Check error tracking (Sentry)
- [ ] Monitor analytics
- [ ] Verify database backups
- [ ] Test update mechanism
- [ ] Update documentation
- [ ] Notify users (if applicable)
- [ ] Monitor app store reviews
- [ ] Set up monitoring alerts

---

## Support & Maintenance

### Regular Maintenance Tasks

**Weekly:**
- [ ] Check error logs
- [ ] Review user feedback
- [ ] Monitor performance metrics

**Monthly:**
- [ ] Update dependencies
- [ ] Review and fix bugs
- [ ] Plan new features
- [ ] Test backup restoration

**Quarterly:**
- [ ] Security audit
- [ ] Performance optimization
- [ ] User experience review
- [ ] Update documentation

### Support Channels

Set up support channels:

1. **Email**: support@yourcompany.com
2. **In-app feedback**: Add feedback form
3. **Documentation**: Online help center
4. **FAQ**: Common questions and answers

---

## Conclusion

Follow this guide to successfully deploy Worker WageBook to production. Ensure all pre-deployment checks pass before going live.

**Key Points:**
- Test thoroughly before deployment
- Use EAS Build for mobile apps
- Implement proper backup strategy
- Monitor errors and performance
- Have rollback plan ready

**Support:**
- Expo Documentation: https://docs.expo.dev
- EAS Documentation: https://docs.expo.dev/eas/
- Play Console: https://play.google.com/console
- App Store Connect: https://appstoreconnect.apple.com
