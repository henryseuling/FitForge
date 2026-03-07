# FitForge Comprehensive Audit Report
**Date:** March 1, 2026
**Audited by:** 3 parallel agents (Backend, Frontend/UX, Integration/Build)

---

## Executive Summary

Three independent agents audited the entire FitForge codebase simultaneously, then cross-checked each other's findings. The app has a **solid architectural foundation** (Expo SDK 55, Supabase, Zustand, NativeWind) and a **well-designed UI**, but has **35 bugs** ranging from critical to low severity. The blocking login issue has a clear root cause.

---

## CRITICAL FINDING: Root Cause of "Invalid API Key" Error

### The Problem
The app shows "Invalid API key" when attempting to log in or sign up, preventing all use.

### Root Cause (All 3 Agents Agree)
**The `.env` file is not being included in EAS cloud builds properly.** Here's why:

1. `lib/supabase.ts` reads credentials via `process.env.EXPO_PUBLIC_SUPABASE_URL`
2. If the env var is undefined, it falls back to `'https://your-project.supabase.co'` (placeholder)
3. Expo SDK 55 auto-loads `.env` files at build time — no plugins needed
4. **However**, your `.env` was created locally AFTER the Git repo was set up. It IS included in uploads (not gitignored), but:
   - The old EAS secrets stored the **previous invalid anon key** (`iat: 1740862226`)
   - The new key you provided from Supabase (`iat: 1772300566`) was updated in local `.env` but the EAS secret system is in a broken state (deprecated `secret:create` vs new `env:create`)
   - The build log explicitly said: **"No environment variables with visibility 'Plain text' and 'Sensitive' found for the 'production' environment on EAS"**

### The Fix
The `.env` file approach should work since Expo SDK 55 auto-loads it. The issue is ensuring EAS picks it up. Two options:

**Option A (Recommended): Commit `.env` to Git**
Since the Supabase anon key is designed to be public (protected by RLS), and the `.env` isn't gitignored:
```bash
cd /Users/henryfelellat1/FitForge
git add .env
git commit -m "add .env with Supabase credentials"
git push
eas build --platform ios --profile production --clear-cache
```

**Option B: Fix EAS environment variables with new CLI**
```bash
eas env:list  # See what's currently stored
eas env:update --name EXPO_PUBLIC_SUPABASE_URL --value "https://sopehnasvzeleoriztjd.supabase.co" --environment production
eas env:update --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvcGVobmFzdnplbGVvcml6dGpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDA1NjYsImV4cCI6MjA4Nzg3NjU2Nn0.hXRSFxTK7ugsSd63l8Niy6TJA_wk-fQH_vy9PIvrwsw" --environment production
```

**Option C: Add env validation so the app fails loudly instead of silently**
Update `lib/supabase.ts` to throw an error if env vars are missing:
```typescript
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase credentials. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env'
  );
}
```

---

## All 35 Bugs (from existing AUDIT.md + new findings)

### CRITICAL (P0) — 6 bugs

| ID | Bug | File | Impact |
|----|-----|------|--------|
| BUG-01 | No data loads from Supabase (stores start empty) | All stores, useAppSync | **FIXED** — useAppSync now calls loadProfile/loadWorkout/etc |
| BUG-02 | Profile never loads after signup | useAuthStore | Settings shows blank |
| BUG-03 | No data persists to Supabase (changes lost on restart) | All stores | Data loss |
| BUG-04 | Splash screen hides before auth resolves | _layout.tsx | UI flash |
| BUG-05 | Claude tool-use protocol incomplete (no tool_result) | lib/claude.ts | AI features broken |
| BUG-06 | Claude API key shipped in client bundle | lib/claude.ts, meal-scanner.ts | Security risk |

### HIGH (P1) — 14 bugs

| ID | Bug | File | Impact |
|----|-----|------|--------|
| BUG-07 | Auth listener leak | useAuthStore.ts | Duplicate updates |
| BUG-08 | isLoading stuck on error in chat | useChatStore.ts | Chat freezes |
| BUG-09 | Double navigation on login | login.tsx + _layout.tsx | Race condition |
| BUG-10 | VolumeChart crashes on empty data (-Infinity) | progress.tsx | Crash |
| BUG-11 | MStrengthCard NaN progress bar | progress.tsx | Render bug |
| BUG-12 | CalorieRing SVG overflow | eat.tsx | Visual bug |
| BUG-13 | HRV value 1000x too high | lib/health.ts | Bad readiness data |
| BUG-14 | Timezone bug in "today" queries | lib/api.ts | Wrong day's data |
| BUG-15 | Duplicate calorieTarget across stores | useUserStore/useNutritionStore | Values drift |
| BUG-16 | updateKeyLift no-ops on empty array | useProgressStore.ts | AI tool broken |
| BUG-17 | Rest timer interval drift (deps issue) | index.tsx | Timer inaccurate |
| BUG-18 | Rest timer starts without logging a set | index.tsx | UX bug |
| BUG-19 | signOut has no error handling | useAuthStore.ts | Stuck session |
| BUG-20 | updateProfile accepts function keys | useUserStore.ts | Store corruption |

### MEDIUM (P2) — 13 bugs

| ID | Bug | Impact |
|----|-----|--------|
| BUG-21 | Integration status always shows "Connected" | Misleading |
| BUG-22 | Settings rows display-only (chevrons suggest tappable) | UX confusion |
| BUG-23 | ProfileCard not tappable | Dead UI |
| BUG-24 | "History" button on Train screen is dead | Dead UI |
| BUG-25 | PeriodSelector does nothing | Dead UI |
| BUG-26 | "Workout loaded" always green even when empty | Misleading |
| BUG-27 | Context pill shows " · Day 0" when empty | Ugly UI |
| BUG-28 | Negative protein remaining text | "You need ~-20g more" |
| BUG-29 | Rapid chat messages race condition | Message loss |
| BUG-30 | Meal scanner JSON parsing fragile | Parse failures |
| BUG-31 | fetchProfile has no user filter (relies on RLS only) | Security concern |
| BUG-32 | fetchNutritionTargets same issue | Security concern |
| BUG-33 | Schema mismatches between stores and DB (6 items) | Data bugs |

### LOW (P3) — 2 bugs

| ID | Bug | Impact |
|----|-----|--------|
| BUG-34 | Unused Circle import in camera.tsx | Dead code |
| BUG-35 | Unused @anthropic-ai/sdk in package.json | Bundle bloat |

---

## Claude API Issues

### Issue 1: Inconsistent Model Names
Three different model strings used across the codebase:
- `lib/claude.ts`: `'claude-sonnet-4-6'` (invalid)
- `lib/meal-scanner.ts`: `'claude-sonnet-4-6'` (invalid)
- `lib/workoutEngine.ts`: `'claude-sonnet-4-20250514'` (valid)

**Fix:** Standardize all to `'claude-sonnet-4-20250514'` (the valid model string).

### Issue 2: API Key in Client Bundle
The `EXPO_PUBLIC_CLAUDE_API_KEY` is embedded in the JavaScript bundle. Anyone can extract it.
**Fix:** Move all Claude API calls to a Supabase Edge Function. The client sends requests to your backend; the backend calls Claude with the secret key.

### Issue 3: Incomplete Tool-Use Protocol
When Claude returns `tool_use` blocks, the app dispatches tools locally but never sends `tool_result` back. Claude can't confirm what happened or chain tool calls.
**Fix:** After dispatching tools, call `sendToolResults()` (the function exists but isn't wired up in `useChatStore`).

---

## Frontend UI/UX Audit Summary

### Overall Assessment: GOOD foundation, needs polish

**Strengths:**
- Excellent design system (colors, typography, spacing) via `lib/theme.ts`
- Clean tab navigation with proper modal presentations
- Outstanding onboarding flow (6 steps with haptics)
- Beautiful calorie ring and progress visualizations
- Comprehensive active workout screen with rest timer, swap suggestions, AI analysis

**Critical UX Issues:**
1. **Accessibility**: No `accessibilityLabel` on interactive elements; touch targets below 44x44; color-only status indicators
2. **Delete Account**: No two-step confirmation (App Store requirement)
3. **Input validation**: No visual error states on form fields (no red borders, no field-level messages)

**High Priority UX Improvements:**
1. Add loading skeletons for API-driven content (coach preview, meal suggestions)
2. Add toast notifications for confirmations (profile saved, meal deleted, etc.)
3. Add password visibility toggle on login
4. Input focus states (border highlight)
5. Animated loading dots for chat "Thinking..."

**Medium Priority:**
1. Calendar heatmap needs date labels and legend
2. Gender chips overflow on iPhone SE
3. No unsaved changes warning on edit profile
4. Water tracker buttons hard to reach one-handed

---

## Recommended Fix Order (For Claude Code Prompt)

### Phase 1: Unblock Login (30 minutes)
1. Ensure `.env` is committed and included in EAS builds
2. Add env validation in `supabase.ts` (throw instead of silent fallback)
3. Fix Claude model names to `'claude-sonnet-4-20250514'`
4. Rebuild with `--clear-cache`

### Phase 2: Fix Critical Bugs (2-4 hours)
5. Wire data persistence — store actions call `lib/api.ts` write functions
6. Fix splash screen race condition
7. Remove double navigation on login
8. Fix empty-state crashes (VolumeChart, MStrengthCard, CalorieRing)
9. Fix chat isLoading stuck on error
10. Complete Claude tool-use loop (wire `sendToolResults`)

### Phase 3: Fix High Priority Bugs (4-8 hours)
11. Fix auth listener cleanup
12. Fix HRV multiplication (remove `* 1000`)
13. Fix timezone in "today" queries
14. Unify calorieTarget across stores
15. Fix rest timer drift + start-without-logging
16. Fix updateKeyLift on empty array
17. Fix signOut error handling
18. Fix updateProfile type safety

### Phase 4: UX Polish (1-2 days)
19. Add accessibility labels and proper touch targets
20. Add delete account confirmation
21. Wire dead buttons (History, Settings rows, ProfileCard, PeriodSelector)
22. Fix misleading status indicators (integrations, workout loaded, context pill)
23. Fix negative protein text
24. Add loading states and toast notifications
25. Add input validation with visual feedback

### Phase 5: Security (1-2 days)
26. Move Claude API calls to Supabase Edge Function
27. Add explicit user filters to all DB queries
28. Fix schema mismatches between stores and database

---

## Quick Reference: Commands to Fix API Issue

```bash
# Step 1: Verify .env has correct key
cd /Users/henryfelellat1/FitForge
cat .env
# Should show the NEW key (iat: 1772300566)

# Step 2: Commit .env so EAS builds include it
git add .env
git commit -m "add env file with Supabase credentials"
git push

# Step 3: Rebuild with clean cache
eas build --platform ios --profile production --clear-cache

# Step 4: Submit to TestFlight
eas submit --platform ios
```
