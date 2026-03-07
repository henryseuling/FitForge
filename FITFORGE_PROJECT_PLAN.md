# FitForge — Project Plan

## Overview
FitForge is an AI-powered iOS fitness app built with Expo (SDK 55), React Native, Supabase, NativeWind/Tailwind, and Claude Sonnet for intelligent workout programming. The app provides personalized workout plans, real-time coaching, nutrition tracking, and progress analytics — powered by an AI engine that adapts to user behavior, history, and goals.

---

## Tech Stack
- **Framework:** Expo SDK 55 + Expo Router
- **Language:** TypeScript
- **Backend/Auth:** Supabase (PostgreSQL, Auth, Row Level Security)
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **AI Engine:** Claude Sonnet (Anthropic) — primary workout intelligence, coaching, and meal suggestions
- **Fonts:** DM Sans (via @expo-google-fonts/dm-sans), JetBrains Mono (local TTF)
- **Build/Deploy:** EAS Build + EAS Submit → TestFlight → App Store

## Accounts & Credentials
- **Supabase Project ID:** sopehnasvzeleoriztjd
- **Supabase URL:** https://sopehnasvzeleoriztjd.supabase.co
- **Expo Account:** henryseuling (expo.dev)
- **Apple Developer Account:** hhechtfelella@gmail.com
- **Bundle Identifier:** co.henryseuling.fitforge
- **Env file:** `/Users/henryfelellat1/FitForge/.env` (also committed to Git)
- **Credentials approach:** Supabase URL + anon key in `app.json` extra (read via `expo-constants`). Claude API key also in `app.json` extra. This bypasses .env loading issues with EAS cloud builds.
- **GitHub:** https://github.com/henryseuling/FitForge
- **App Store Connect:** https://appstoreconnect.apple.com

---

## Build History

### Session 1 — March 1, 2026 (Initial Setup & First TestFlight)

**Infrastructure Setup:**
1. Supabase project created, API keys configured
2. Claude API key generated and stored in `.env`
3. Expo project initialized with all dependencies
4. Fixed DMSans font loading error (CTFontManagerError 104) — switched from local TTF files to `@expo-google-fonts/dm-sans` package in `app/_layout.tsx`
5. Fixed npm cache permission issues (`sudo chown -R $(whoami) ~/.npm`)
6. EAS CLI installed, project configured for all platforms
7. Apple Developer account linked, certificates and provisioning profiles auto-generated
8. Device registered for development builds via EAS website method
9. Bundle ID changed from `com.fitforge.app` (taken) to `co.henryseuling.fitforge`
10. Development build created and tested on iPhone
11. Production build completed and submitted to TestFlight
12. App available for testing via TestFlight

**Initial Issues Found:**
- Profile doesn't load properly after account creation
- "Start Workout" button non-functional
- Settings screen rows not tappable
- No workout plan generation
- No goal input system
- Various dead-end screens and non-functional buttons

**Comprehensive Feature Build (via Claude Code):**
Submitted full 11-part build prompt to Claude Code covering:
- Part 1: Fix all broken features (profile, start workout, settings, dead ends)
- Part 2: Onboarding flow (goals, experience, stats, equipment, frequency)
- Part 3: Exercise database (80-100 exercises with full metadata)
- Part 4: AI-powered workout engine (Claude Sonnet as primary intelligence)
- Part 5: Active workout screen (sets, reps, weight tracking, rest timer)
- Part 6: Workout history & progress tracking (charts, PRs, heat map)
- Part 7: Goal system (weight, strength, frequency targets)
- Part 8: Nutrition (meal logging, macros, water, AI meal suggestions)
- Part 9: AI coach chat (Claude-powered conversational coach)
- Part 10: Polish & UX (empty states, skeletons, haptics, error handling)
- Part 11: Supabase schema (all tables, RLS, triggers, indexes)

**SQL Migrations:** Output to `/Users/henryfelellat1/FitForge/supabase-migrations.sql` — must be run in Supabase SQL Editor.

**Second TestFlight build:** Submitted after Claude Code feature build.

### Session 2 — March 1-2, 2026 (API Fix, Full Audit, Bug Fixes)

**Critical Issue: "Invalid API key" blocking login (Builds 9-13)**

The app was returning "Invalid API key" on every login attempt. Multiple debugging rounds:

1. **Discovered the Supabase anon key was invalid.** The original key (iat: 1740862226) had been rotated. Verified via curl — old key returned HTTP 401, new key (iat: 1772300566) returned HTTP 200.

2. **EAS Secrets approach failed.** Used `eas secret:create` to store env vars, but the CLI had migrated to `eas env:create`. The deprecated secrets were stored in a format the new build system couldn't read. Build logs showed: "No environment variables with visibility 'Plain text' and 'Sensitive' found for the 'production' environment on EAS."

3. **`.env` file approach failed.** Committed `.env` to Git (it's not gitignored), rebuilt with `--clear-cache`. The `.env` was in the project but Expo wasn't properly loading it during EAS cloud builds.

4. **Final fix: `app.json` extra + `expo-constants` (Build 13 — SUCCESS).** Added Supabase URL and anon key directly to `app.json` under `expo.extra`. Updated `lib/supabase.ts` to read credentials via `Constants.expoConfig?.extra?.supabaseUrl` instead of `process.env`. This approach is 100% reliable because `app.json` is always read at build time.

**Key file changes for API fix:**
- `app.json` — added `supabaseUrl` and `supabaseAnonKey` to `extra`
- `lib/supabase.ts` — reads from `Constants.expoConfig?.extra` with process.env fallback

**Comprehensive 3-Agent Audit:**

Launched 3 parallel audit agents:
- Agent 1: Backend/API/Database
- Agent 2: Frontend UI/UX
- Agent 3: Integration/Build Pipeline (devil's advocate)

**Audit Results:** 35 bugs identified across 4 severity levels:
- 6 Critical (P0) — API key loading, data persistence, tool-use protocol, security
- 14 High (P1) — empty state crashes, timezone bugs, timer drift, auth issues
- 13 Medium (P2) — dead buttons, misleading indicators, race conditions
- 2 Low (P3) — unused imports/dependencies

Full audit report: `FITFORGE_FULL_AUDIT_REPORT.md`

**Bug Fix Prompt Execution (Build 14):**

Claude Code fixed 13 files, addressing all priority bugs:

| Fix | Files Changed | Bug IDs |
|-----|---------------|---------|
| Profile loads after signup | useAuthStore.ts, useUserStore.ts | BUG-02 |
| Claude API key via Constants | claude.ts, meal-scanner.ts, workoutEngine.ts, app.json | BUG-06 |
| Claude model name fixed | claude.ts, meal-scanner.ts | — |
| MStrengthCard NaN guard | progress.tsx | BUG-11 |
| CalorieRing overflow clamp | eat.tsx | BUG-12 |
| HealthKit permission fix | health.ts | BUG-13 |
| Timezone fix in queries | api.ts | BUG-14 |
| PeriodSelector wired | useProgressStore.ts, progress.tsx | BUG-25 |
| Chat race condition guard | useChatStore.ts | BUG-29 |
| Workout status indicator | chat.tsx | BUG-26, BUG-27 |
| Negative protein clamped | eat.tsx | BUG-28 |
| Meal scanner parsing robust | meal-scanner.ts | BUG-30 |
| RIR/RPE mapping fixed | api.ts | BUG-33 |

TypeScript check: 0 errors. All changes committed and pushed.

**Build History This Session:**
| Build | Change | Result |
|-------|--------|--------|
| 9 | Set EAS secrets (old CLI) | ❌ Invalid API key |
| 10 | Updated anon key in EAS secrets + .env | ❌ Invalid API key |
| 11 | Committed .env to Git + --clear-cache | ❌ Invalid API key |
| 12 | app.json extra + Constants approach | ❌ (not submitted — was build 11's test) |
| 13 | app.json extra + Constants (confirmed) | ✅ Login works! |
| 14 | 35-bug fix prompt executed | ✅ Submitted to TestFlight |

---

## AI Workout Engine Architecture

Claude Sonnet is the PRIMARY workout intelligence. Not a rule-based system — a true AI coach.

### How It Works:
1. **Plan Generation:** Every week, Claude receives the user's full profile, last 4 weeks of workout history, progress data, previous plan completion rates, and difficulty ratings. It generates a personalized weekly plan with periodization, progressive overload, and recovery management.

2. **Mid-Workout Adjustments:** During a workout, Claude can adjust remaining sets/reps based on actual performance vs targets.

3. **Post-Workout Analysis:** After each workout, Claude generates a performance summary, identifies potential form issues, recommends recovery, and provides motivation.

4. **Exercise Swaps:** If a user wants to swap an exercise mid-workout, Claude suggests 3 intelligent alternatives based on muscle group, equipment, and what's already in the workout.

5. **Weekly Adaptation:** Each Monday, Claude reviews what actually happened vs what was planned and restructures accordingly (e.g., if legs were skipped, it prioritizes them).

6. **Offline Fallback:** If API fails, repeats last successful plan with +5% weight increases.

### Programming Principles (built into Claude system prompt):
- Undulating periodization (heavy/moderate/light days)
- Progressive overload based on actual logged data
- Muscle group recovery tracking
- Weak point identification and accessory work
- Auto-deload every 4th week
- Goal-specific rep/set schemes
- Equipment-filtered exercise selection
- Experience-appropriate volume and exercise complexity

---

## Feature Status

### Working (Verified)
- Auth flow (signup/login via Supabase) — fixed in Session 2, Build 13
- Tab navigation (5 tabs)
- TestFlight distribution (14 builds submitted)
- Camera integration (dev build)
- Apple Health integration (dev build)
- Font loading (DM Sans via Google Fonts package)
- Supabase credentials via `app.json` extra + `expo-constants`
- Claude API integration (model: `claude-sonnet-4-20250514`)
- Profile loads after signup (BUG-02 fixed)

### Built (Pending Verification)
- Onboarding flow (5-step post-signup)
- AI workout engine (Claude Sonnet-powered)
- Exercise database (80-100 exercises)
- Active workout screen (sets, reps, weight, rest timer)
- Workout history & progress charts
- Goal system
- Nutrition tracking & AI meal suggestions
- AI coach chat with tool-use protocol
- Settings (all rows functional)
- Supabase schema (tables, RLS, triggers)

### Fixed in Session 2 (Build 14)
- [x] Claude model names corrected across all files
- [x] Claude API key reliably loaded via Constants
- [x] MStrengthCard NaN progress bar
- [x] CalorieRing SVG overflow
- [x] HRV HealthKit permission constant
- [x] Timezone bug in "today" queries
- [x] PeriodSelector wired to reload data
- [x] Chat race condition on rapid messages
- [x] Workout loaded/not loaded indicator
- [x] Negative protein text clamped
- [x] Meal scanner JSON parsing robustness
- [x] RIR/RPE database mapping

### Remaining
- [ ] Verify all features end-to-end on device (Build 14 in TestFlight)
- [ ] Test AI workout generation with real user data
- [ ] Test mid-workout intelligence and exercise swaps
- [ ] Test nutrition macro calculations and meal scanning
- [ ] Apple Health data sync verification
- [ ] Move Claude API calls to Supabase Edge Function (security — BUG-06)
- [ ] Full QA pass on all screens
- [ ] Accessibility audit fixes (labels, touch targets, contrast)
- [ ] App Store submission (description, screenshots, privacy policy)
- [ ] Clean up EAS environment variables (migrate from deprecated secrets)

---

## Supabase Tables

| Table | Purpose |
|-------|---------|
| user_profiles | Goals, stats, preferences, onboarding data, favorites |
| workout_plans | AI-generated weekly plans (JSON), coach notes |
| workouts | Completed workout records with AI summary |
| workout_exercises | Exercises within a workout |
| workout_sets | Individual sets (weight, reps, PR flags) |
| personal_records | All-time bests per exercise |
| goals | User goals with progress tracking |
| meals | Food logging with macros |
| water_intake | Daily water tracking |
| weight_checkins | Body weight over time |

---

## Build & Deploy Commands

**Dev build (camera + Apple Health):**
```bash
cd /Users/henryfelellat1/FitForge
eas build --platform ios --profile development
npx expo start --dev-client
```

**Production build + TestFlight:**
```bash
cd /Users/henryfelellat1/FitForge
eas build --platform ios --profile production
eas submit --platform ios
```

**App Store Connect:** https://appstoreconnect.apple.com → FitForge → TestFlight

---

## Project Location
- **Local path:** `/Users/henryfelellat1/FitForge`
- **Expo dashboard:** https://expo.dev/accounts/henryseuling/projects/FitForge
- **First TestFlight build:** https://expo.dev/artifacts/eas/uJCBE5HMx528WPdhYyNBEh.ipa
- **Build 13 (login fix):** https://expo.dev/artifacts/eas/f1EWciC1gP8N3srm6WmhNQ.ipa
- **Build 14 (bug fixes):** https://expo.dev/artifacts/eas/wJCmJ1f4eyNYWkrASQ3Sar.ipa
- **EAS Project ID:** e02df1f0-9a88-47b0-9279-d4f35705a920
- **ASC App ID:** 6759851272

---

## Related Documents
- `FITFORGE_FULL_AUDIT_REPORT.md` — Complete 3-agent audit with all 35 bugs, severity ratings, and fixes
- `FITFORGE_BUG_FIX_PROMPT.md` — The Claude Code prompt used to fix all bugs in Build 14
