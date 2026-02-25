# 🎮 Idle Realms MMO — Deployment Guide

## What You'll Need
- A **Google account** (for Firebase)
- A **GitHub account** (for Vercel deployment)
- **Node.js 18+** installed on your computer ([download](https://nodejs.org))
- About **15 minutes**

---

## Step 1: Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create a project"** (or "Add project")
3. Name it `idle-realms` (or anything you like)
4. Disable Google Analytics (not needed) → **Create Project**
5. Wait for it to finish, then click **Continue**

### Enable Authentication
1. In the Firebase console sidebar, click **Build → Authentication**
2. Click **Get started**
3. Under "Sign-in method", click **Email/Password**
4. Toggle **Enable** → **Save**

### Create Firestore Database
1. In the sidebar, click **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (we'll add rules later)
4. Pick a location close to your users → **Enable**

### Get Your Firebase Config
1. In the sidebar, click the **⚙️ gear** → **Project settings**
2. Scroll down to "Your apps" → click the **</>** (Web) icon
3. Register the app as `idle-realms` → **Register app**
4. You'll see a config object like this:
```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "idle-realms.firebaseapp.com",
  projectId: "idle-realms",
  storageBucket: "idle-realms.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```
5. **Copy these values** — you'll paste them into your `.env.local` file in Step 3.

---

## Step 2: Set Up Firestore Security Rules

1. In Firebase console → **Firestore Database → Rules**
2. Replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User save data — only the owner can read/write
    match /saves/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // User quest data — only the owner
    match /quests/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Shared data — any logged-in user can read/write
    // (leaderboards, market, chat, clans, parties)
    match /shared/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

---

## Step 3: Set Up the Project Locally

1. Download/clone this project folder to your computer
2. Open a terminal in the project folder
3. Create a `.env.local` file with your Firebase config:

```bash
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=idle-realms.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=idle-realms
VITE_FIREBASE_STORAGE_BUCKET=idle-realms.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

4. Install dependencies:
```bash
npm install
```

5. Test locally:
```bash
npm run dev
```

6. Open [http://localhost:5173](http://localhost:5173) — you should see the game!

---

## Step 4: Push to GitHub

1. Create a new repository on [github.com](https://github.com/new)
   - Name: `idle-realms`
   - Private or Public — your choice
   - **Don't** initialize with README
2. In your terminal:
```bash
git init
git add .
git commit -m "Initial commit - Idle Realms MMO"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/idle-realms.git
git push -u origin main
```

---

## Step 5: Deploy to Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New..." → Project**
3. Import your `idle-realms` repository
4. Vercel auto-detects Vite — settings should be:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **"Environment Variables"** and add ALL your Firebase env vars:
   - `VITE_FIREBASE_API_KEY` = your key
   - `VITE_FIREBASE_AUTH_DOMAIN` = your domain
   - `VITE_FIREBASE_PROJECT_ID` = your project id
   - `VITE_FIREBASE_STORAGE_BUCKET` = your bucket
   - `VITE_FIREBASE_MESSAGING_SENDER_ID` = your sender id
   - `VITE_FIREBASE_APP_ID` = your app id
6. Click **Deploy**
7. Wait ~60 seconds — you'll get a URL like `idle-realms.vercel.app` 🎉

---

## Step 6: Share Your Game!

Your game is now live at `https://idle-realms.vercel.app` (or whatever Vercel assigns).

- **Works on mobile** — fully responsive
- **Multiplayer** — market, chat, clans, leaderboards all shared via Firestore
- **Free tier limits** — Firebase Spark plan gives you:
  - 50K reads/day, 20K writes/day
  - 1 GiB storage
  - More than enough for hundreds of players

---

## Troubleshooting

**"Module not found" errors**: Run `npm install` again

**Blank page after deploy**: Check environment variables are set in Vercel (Settings → Environment Variables)

**Auth not working**: Make sure Email/Password is enabled in Firebase → Authentication → Sign-in method

**Firestore permission denied**: Check your security rules match Step 2

**Want a custom domain?**: In Vercel → Settings → Domains → Add your domain
