# Firebase Authentication & Save System Setup

This game now includes Firebase authentication and cloud save functionality. Follow these steps to set it up:

## 1. Install Firebase

Run the following command in your terminal:

```bash
npm install firebase
```

## 2. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard to create your project

## 3. Enable Authentication ⚠️ REQUIRED

**THIS STEP IS CRITICAL - Without it you'll get "auth/operation-not-allowed" error!**

1. In the Firebase Console, navigate to **Build > Authentication**
2. Click "Get started" button
3. Click on the **"Sign-in method"** tab at the top
4. Enable **Email/Password** authentication:
   - Click on "Email/Password" in the list of providers
   - Toggle the **first switch** to "Enable" (the one that says "Email/Password")
   - Click "Save"
   
![You should see Email/Password status change to "Enabled" in green]

**Note:** You don't need to enable "Email link (passwordless sign-in)" - just the basic Email/Password option.

## 4. Enable Firestore Database ⚠️ REQUIRED

**THIS STEP IS CRITICAL - Without it saves won't work!**

1. In the Firebase Console, navigate to **Build > Firestore Database**
2. Click "Create database"
3. **IMPORTANT**: Choose **Start in test mode** for now (easier to debug)
4. Select a location closest to your users
5. Click "Enable"

## 5. Configure Firestore Security Rules

In Firestore Database, go to the "Rules" tab.

### For Development/Testing (use this first):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own saves
    match /saves/{saveId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### For Production (more secure):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /saves/{saveId} {
      allow read: if request.auth != null && 
                    resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
                      request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && 
                              resource.data.userId == request.auth.uid;
    }
  }
}
```

Click "Publish" to save the rules.

## 6. Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon near "Project Overview")
2. Scroll down to "Your apps" section
3. Click the **Web** icon (`</>`) to add a web app
4. Register your app with a nickname (e.g., "OP Game")
5. Copy the `firebaseConfig` object

## 7. Configure Environment Variables

1. Open the `.env.local` file in the root of your project
2. Replace the placeholder values with your actual Firebase config:

```env
VITE_FIREBASE_API_KEY=your-actual-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-actual-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-actual-sender-id
VITE_FIREBASE_APP_ID=your-actual-app-id
```

**Important:** Never commit `.env.local` to version control!

## 8. Start the Development Server

```bash
npm run dev
```

## Features Implemented

### Authentication
- **Email/Password Registration**: Users can create accounts with email and password
- **Login/Logout**: Secure authentication flow
- **Protected Routes**: Game only accessible when logged in

### Save System
- **Autosave**: Game automatically saves every 5 seconds (debounced) and on significant state changes
- **Cloud Saves**: Saves stored in Firebase Firestore (accessible across devices)
- **Local Fallback**: Saves to localStorage as backup
- **Save on Exit**: Automatically saves to localStorage when closing/refreshing the page

### Save Data Includes
- Player position, level, XP
- Inventory items
- Active and completed quests
- Quest items (visible and hidden)
- NPC quiz progress
- UI state (tutorial shown, etc.)

### Account Management
- View all saved games
- Delete manual saves (autosave protected)
- Account information display

## Usage

1. **First Time**: Create an account on the login screen
2. **Playing**: Your game automatically saves as you play
3. **Returning**: Simply log in to load your last autosave
4. **Multiple Devices**: Log in from any device to continue your progress
5. **Account Page**: Click your name in the top-left corner to view saves and manage your account

## Troubleshooting

### "Failed to load game" error
- Check that Firebase config in `.env.local` is correct
- Verify Firestore security rules are set up
- Check browser console for specific error messages

### "Failed to save game" error
- Ensure you're logged in
- Check Firestore rules allow writes
- Verify your internet connection

### Changes not saving
- Wait at least 5 seconds after making changes (debounce period)
- Check browser console for autosave logs
- Try manually refreshing - localStorage backup should work

## Development Notes

- **Autosave Frequency**: 5-second debounce, max once per 10 seconds
- **Save Version**: `1.0` (for future migration support)
- **Offline Support**: Falls back to localStorage when not authenticated
- **Save Slots**: Currently supports 'autosave' slot (expandable to multiple manual slots)

## Security

- Firestore rules ensure users can only access their own saves
- Firebase handles password encryption and secure authentication
- Environment variables keep your API keys secure

## Next Steps (Optional Enhancements)

- Add social authentication (Google, GitHub)
- Implement multiple manual save slots
- Add save encryption
- Add cloud-to-local sync for offline play
- Implement save file sharing/export

---

For more information, see:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
