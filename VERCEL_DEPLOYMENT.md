# Vercel Deployment Guide

This guide explains how to deploy the Project Assembler application to Vercel.

## Prerequisites

1. A Vercel account (free tier is sufficient)
2. A Firebase project with Authentication and Firestore enabled
3. Firebase service account JSON file
4. GitHub repository with the project code

## Step 1: Deploy Backend API Server

The backend API server needs to be deployed separately since Vercel is primarily for frontend applications. Consider using:
- **Vercel Serverless Functions** (recommended for this project)
- **Railway**, **Render**, or **Heroku** for the Express.js backend

For this guide, we'll use Vercel Serverless Functions.

### Convert Express.js to Vercel Serverless Functions

1. Create `api/` directory in the project root
2. Move the Express.js routes to serverless functions
3. Update the API client to use the new endpoints

## Step 2: Deploy Frontend to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository: `buytuk20/book`
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `artifacts/project-assembler`
   - **Build Command**: `pnpm run build`
   - **Output Directory**: `dist`

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy from the project directory:
   ```bash
   cd artifacts/project-assembler
   vercel
   ```

## Step 3: Configure Environment Variables

In your Vercel project settings, add the following environment variables:

### Frontend Environment Variables (in Vercel Dashboard)

```
VITE_API_URL=https://your-backend-api-url.com/api
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Backend Environment Variables (if using Vercel Serverless Functions)

```
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

**Important**: For the Firebase service account, you need to:
1. Convert the JSON file to a single-line string
2. Escape any quotes properly
3. Add it as an environment variable

## Step 4: Firebase Configuration

### Firebase Security Rules

Update your Firestore security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /projects/{projectId} {
      allow read, write: if request.auth != null 
        && resource.data.userId == request.auth.uid;
      
      match /files/{fileId} {
        allow read, write: if request.auth != null 
          && resource.data.projectId == projectId;
      }
    }
  }
}
```

### Firebase Authentication Settings

1. Enable Email/Password provider
2. Enable Google provider
3. Set up authorized domains:
   - Add your Vercel domain (e.g., `your-project.vercel.app`)
   - Add any custom domains

## Step 5: Deploy and Test

1. Push your changes to GitHub
2. Vercel will automatically deploy
3. Test the deployed application:
   - Check authentication flow
   - Test project creation and management
   - Verify file operations
   - Test both English and Arabic UI

## Troubleshooting

### Build Errors

- **Module not found**: Ensure all dependencies are in `package.json`
- **TypeScript errors**: Run `pnpm run typecheck` locally first
- **Environment variables**: Verify all required variables are set in Vercel

### Runtime Errors

- **Firebase connection**: Check Firebase configuration values
- **API errors**: Verify backend API is deployed and accessible
- **CORS issues**: Ensure backend allows requests from your Vercel domain

### Performance Optimization

- Enable Vercel Analytics
- Set up custom domain
- Configure CDN caching
- Optimize images and assets

## Custom Domain Setup

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. Update Firebase authorized domains

## Monitoring and Logs

- **Vercel Dashboard**: View deployment logs and analytics
- **Firebase Console**: Monitor authentication and Firestore usage
- **Vercel Analytics**: Track user behavior and performance

## Cost Considerations

- **Vercel**: Free tier includes 100GB bandwidth and unlimited deployments
- **Firebase**: Free tier includes:
  - Authentication: 10,000 verifications/month
  - Firestore: 50,000 reads, 20,000 writes/day
  - Storage: 5GB

## Update Process

To update the deployed application:

1. Make changes to your code
2. Commit and push to GitHub
3. Vercel automatically deploys the changes
4. Monitor the deployment in Vercel Dashboard

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/deployment.html)
