# Rowing Training Planner (beta)

Minimal React + Firebase app for team availability (When2Meet-style) with automatic training suggestions.

## Quick start

1) Install Node 18+
2) Create a Firebase project → enable **Firestore** + **Hosting**
3) In Firebase console → Project settings → Add web app → copy config and paste into `src/firebase.js`
4) (Optional for beta) Set Firestore Rules to public:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
5) Install & run
```bash
npm install
npm run dev
```
6) Build & deploy
```bash
npm run build
# then set up firebase hosting
npm install -g firebase-tools
firebase login
firebase init hosting
# choose this project; set "dist" as public dir; SPA = Yes
firebase deploy
```

## Team / member setup
Edit the `TEAMS` array in `src/App.jsx` to reflect your teams and members.
Week navigation is anchored to Monday. Grid covers 09:00–17:00 in 30‑min slots.
Training suggestion window = 90 minutes (15 prep + 60 row + 15 clean).

## Data model
- Collection: `availability/{teamId}_{weekStart}/{userId}` → `{ grid: { "D2_T10": true, ... } }`
- The UI also computes per-cell overlap and suggests 2x (≥3) or 4+ (≥6) slots.
- Use **Export PNG** to share a weekly snapshot in your team chat.

## Notes
- This beta is public / unauthenticated by design. Lock it down later when needed.
- For better reliability later: add write limits per team and simple passcodes.
