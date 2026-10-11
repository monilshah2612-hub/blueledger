# Turning on the web app and sync (about 20 minutes, once)

You will do three things:

1. Make a **free Firebase project**. This is the private cloud store where your data lives so your phone and the web app can share it.
2. Paste its details into one file in your GitHub repository.
3. Switch on **GitHub Pages**, which gives your web app its own web address.

Everything here is free. You do not need a credit card.

---

## Part 1: Create the Firebase project

1. Go to **console.firebase.google.com** and sign in with your Google account.
2. Click **Create a project** (or **Add project**).
3. Name it `blueledger` and click **Continue**.
4. If it asks about Google Analytics, switch it **off** and click **Create project**. Wait, then click **Continue**.

## Part 2: Turn on email sign-in

1. In the left menu click **Build**, then **Authentication**.
2. Click **Get started**.
3. Open the **Sign-in method** tab and click **Email/Password**.
4. Switch the **first** switch (Email/Password) **on**. Leave "Email link" off. Click **Save**.

## Part 3: Create the database

1. In the left menu click **Build**, then **Firestore Database**.
2. Click **Create database**.
3. If it asks for an edition, choose **Standard**.
4. For location choose **asia-south1 (Mumbai)**, or the nearest one to you. Click **Next**.
5. Choose **Start in production mode** and click **Create**.
6. When the database opens, click the **Rules** tab.
7. Delete everything in the box and paste exactly this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

8. Click **Publish**.

These rules mean only you, signed in, can read or write your own data. Nobody else can see it.

## Part 4: Get your project's details

1. Click the **gear icon** next to "Project Overview" (top left), then **Project settings**.
2. Scroll down to **Your apps** and click the **web icon**, which looks like `</>`.
3. For App nickname type `BlueLedger web`. Leave "Firebase Hosting" **unticked**. Click **Register app**.
4. You will see a block of code with `firebaseConfig = { ... }`. Keep this page open. You need the six lines inside the curly brackets: apiKey, authDomain, projectId, storageBucket, messagingSenderId and appId.

## Part 5: Put those details into your app

1. Open your repository on GitHub and go into the folder **www**, then **js**, then click the file **firebase-config.js**.
2. Click the **pencil icon** (Edit this file) at the top right of the file.
3. Find the last line, which says `window.BL_FIREBASE = null;`
4. Replace that **one line** with the block below, using your own values from Firebase. Keep the quotes and commas exactly as shown:

```
window.BL_FIREBASE = {
  apiKey: "paste your apiKey here",
  authDomain: "paste your authDomain here",
  projectId: "paste your projectId here",
  storageBucket: "paste your storageBucket here",
  messagingSenderId: "paste your messagingSenderId here",
  appId: "paste your appId here"
};
```

5. Click **Commit changes**, then **Commit changes** again.

The values in this file are not passwords. The security rules from Part 3 are what protect your data.

## Part 6: Switch on the web app (GitHub Pages)

1. In your repository click **Settings**, then **Pages** in the left list.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Go to the **Code** tab. Click **Add file**, then **Create new file**.
4. In the name box type exactly `.github/workflows/deploy-web.yml` (typing the slashes makes the folders).
5. Open the file `github-workflow-files/deploy-web.yml` from the update zip, copy everything in it and paste it into the big text box.
6. Click **Commit changes**, then **Commit changes** again.
7. Click the **Actions** tab. A run called **Publish web app** starts. Wait for the green tick (about 1 minute).
8. Your web app address is **https://YOUR-GITHUB-NAME.github.io/blueledger/**. For example `https://monilshah2612-hub.github.io/blueledger/`. You can also see it at Settings, then Pages.

## Part 7: Allow your web address to sign in

1. Back in Firebase go to **Build**, then **Authentication**, then the **Settings** tab, then **Authorized domains**.
2. Click **Add domain** and type `YOUR-GITHUB-NAME.github.io` (no https, no slash). Click **Add**.

## Part 8: Update your phone app

1. In Actions run **Build Android APK** again (**Run workflow**), download the APK and install it over the old one, the same as before.
2. Open the app, go to **More**, then **Sync across devices**, then **Sign in / Create account**.
3. Choose **Create account**, type your email and a password (at least 6 characters), and tap it. Your phone data is now uploaded.
4. Open your web address on a computer, and on the very first screen tap **I already use BlueLedger – sign in to sync**. Sign in with the same email and password. Your accounts and transactions appear.
5. Add a transaction on one device. It shows up on the other within a few seconds.

Tip: on a phone or computer, use your browser's menu to **Install app** or **Add to Home screen** so the web app opens like a normal app.

---

## Good to know

- **New device? Sign in first.** On a device with no data, sign in before doing the setup questions. If you set up first and sign in after, you may get doubled categories.
- **Offline is fine.** The app works without internet. Changes are sent when you are back online.
- **Same entry on two devices?** If you change the same entry on both at nearly the same time, the newest change wins.
- **Receipt photos** sync too. They can take a moment on a slow connection.
- **Free limits.** The free plan allows about 20,000 changes per day and 1 GB of storage. That is far more than personal use needs.
- **Backups still matter.** Keep using **More, then Backup, then Share backup** now and then.
- **Erase all data** on one device only switches sync off there. Your other devices and the cloud copy are not touched. Restoring a backup on one device does update the others to match it.
- **Forgot your password?** Use the **Forgot password?** link on the sign-in sheet.
