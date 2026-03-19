# Fastwiin

## Current State
Full-stack color/number prediction gaming platform with auth (phone+OTP), UPI deposits (admin-approved), withdrawals (manual), game modes (30s/1m/3m), leaderboard, admin panel, notifications, and black/white theme.

## Requested Changes (Diff)

### Add
- Referral system backend:
  - Generate a unique referral code per user (based on phone, e.g. FW + last 6 digits)
  - Store referral relationships: who referred whom
  - Apply ₹20 bonus to new user when they sign up using a valid referral code
  - Apply ₹100 bonus to referrer when their referred friend makes their first deposit
  - Track first-deposit status per user (so bonus is only paid once)
  - API: getReferralCode(phone) -> Text
  - API: applyReferralCode(newUserPhone, referralCode) -> Bool (call during registration)
  - API: getReferralHistory(phone) -> [ReferralRecord] (who referred, bonus earned, status)
  - API: notifyFirstDeposit(phone) -> () (call when deposit is approved; awards ₹100 to referrer if first deposit)

- Frontend referral UI in My Account:
  - "Invite Friends" section showing user's unique referral code with a copy button
  - Referral history list: referred phone (masked), signup bonus status, deposit bonus status
  - During signup (AuthModal), optional "Referral Code" input field; applied after registration

### Modify
- setPassword backend: after registration, if referral code was provided, apply ₹20 bonus
- approveDeposit backend: call notifyFirstDeposit to check and award ₹100 referrer bonus
- AccountPage: add Referral/Invite section tab or card
- AuthModal signup flow: add optional referral code input

### Remove
- Nothing removed

## Implementation Plan
1. Add referral data structures and APIs to Motoko backend
2. Modify setPassword to accept optional referral code and apply ₹20 bonus
3. Modify approveDeposit to trigger referrer ₹100 bonus on first deposit
4. Update frontend AuthModal to include optional referral code field during signup
5. Add referral section to AccountPage with code display, copy button, and history
