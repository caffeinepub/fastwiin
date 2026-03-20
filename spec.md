# Fastwiin

## Current State
- Full-stack color/number prediction gaming platform with phone/OTP auth
- Three game modes (30s, 1min, 3min) running continuously in IST
- UPI-only deposit with admin approval, manual withdrawals
- Admin panel (phone 8200321382), leaderboard, referral system
- In-app round result notifications
- AccountPage with deposit/withdraw, bet history, referral invite tab, language switcher, beginner guide
- Backend has `saveCallerUserProfile` / `getCallerUserProfile` for name storage
- No profile page, no sound effects, no support contact, UI needs polish

## Requested Changes (Diff)

### Add
- Profile page tab in My Account (or dedicated section): editable name, avatar photo upload, account stats (total bets, total winnings, win rate, games played)
- Avatar upload using blob-storage component
- Sound effects: win round (positive chime), lose round (negative tone), last-5-second countdown beeps
- Support section showing contact email: ankitzapda7@gmail.com
- Full-app UI polish pass: premium look across home, game panels, My Account, admin panel

### Modify
- AccountPage: add Profile tab with name/avatar editor and stats
- GameModePage: play win/lose sound on round result; play countdown beep in last-5-second popup
- BottomNav or AccountPage: add Support entry
- Overall styling: elevate visual quality across all screens

### Remove
- Nothing removed

## Implementation Plan
1. Use blob-storage for avatar image upload/retrieval
2. Add Profile tab in AccountPage: fetch profile via `getCallerUserProfile`, save via `saveCallerUserProfile`; show avatar from blob-storage; show stats computed from bet history
3. Create sound effects using Web Audio API (no external files needed) for win, lose, and countdown beeps
4. Add Support section in AccountPage showing ankitzapda7@gmail.com with mailto link
5. Apply full UI polish: better typography, gradients, card shadows, color accents, spacing, and visual hierarchy throughout the app
