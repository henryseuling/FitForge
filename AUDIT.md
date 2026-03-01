# FitForge Full App Audit

Audited: 2026-02-28
Files reviewed: 24 (all files in `app/`, `stores/`, `lib/`, `hooks/`, `components/`)

---

## Part 1 — Bug Audit

### CRITICAL (P0) — App-Breaking

#### BUG-01: No data ever loads from Supabase — all screens start empty
- **Files:** All stores (`stores/*.ts`), `hooks/useAppSync.ts`
- **Problem:** The API layer (`lib/api.ts`) has 14 complete CRUD functions (`fetchProfile`, `fetchTodayWorkout`, `fetchTodayMeals`, `fetchNutritionTargets`, `fetchKeyLifts`, `fetchBodyMetrics`, etc.) but **none are ever called** from any store or hook except `fetchChatHistory`. After the recent store reset changes, every store initializes to zeros/empty arrays. A new user sees: readiness 0, no workout name, no exercises, no meals, no key lifts, no body weight, no streak — a completely blank app.
- **Root cause:** `useAppSync` only calls `loadChatHistory()` and `syncHealthData()`. No store has a `load*` action to hydrate from Supabase.
- **Fix:** Add `loadProfile`, `loadWorkout`, `loadMeals`, `loadNutritionTargets`, `loadKeyLifts`, `loadBodyMetrics` actions to their respective stores. Call all of them from `useAppSync` when a session exists.

#### BUG-02: Profile never loads after signup (the known bug)
- **Files:** `stores/useAuthStore.ts:57-61`, `stores/useUserStore.ts`, `hooks/useAppSync.ts`
- **Problem:** After `signUp()`, `resetAllStores()` clears user store to `name: ''`, `weight: 0`, etc. Then `useAppSync` runs but only syncs chat history and Apple Health — it never calls `fetchProfile()` to populate the user store. The Supabase `signUp` creates a profile row via a DB trigger (with `name` from `auth.users.raw_user_meta_data`), but this profile is never read back. The Settings screen shows empty name, "0 lb", and blank fields.
- **Root cause:** Missing `fetchProfile` → `useUserStore.updateProfile()` call in the sync flow.
- **Fix:** In `useAppSync`, after `loadChatHistory()`, call `fetchProfile()` and dispatch the result to `useUserStore.getState().updateProfile(...)`.

#### BUG-03: No data persists to Supabase — all changes lost on restart
- **Files:** All stores
- **Problem:** Store actions (`logSet`, `addMeal`, `updateKeyLift`, `logBodyWeight`, `updateProfile`, `updateTargets`) only modify local Zustand state. The corresponding API functions (`logSet`, `logMeal`, `logKeyLift`, `logBodyMetric`, `updateProfile`, `updateNutritionTargets`) exist in `lib/api.ts` but are never called from stores. All user data is lost when the app restarts.
- **Fix:** Each store action should also fire-and-forget the corresponding `lib/api.ts` function (same pattern as `saveChatMessage` in chat store).

#### BUG-04: Splash screen hides before auth resolves — visual flash
- **File:** `app/_layout.tsx:54-58`
- **Problem:** `initialize()` is fire-and-forget (not awaited). `SplashScreen.hideAsync()` is called immediately after. The user sees the tabs layout briefly before `useProtectedRoute` redirects to `/login`. On slow networks, this flash can last several seconds.
- **Fix:** Await `initialize()` before calling `SplashScreen.hideAsync()`, or gate splash hide on `!isLoading`.

#### BUG-05: Claude tool-use protocol incomplete — no tool_result follow-up
- **File:** `lib/claude.ts:128-156`
- **Problem:** When Claude returns `tool_use` content blocks, the Anthropic API protocol requires the client to send `tool_result` messages back so Claude can generate a text response that accounts for tool results. This code dispatches tool calls locally but never sends results back. If Claude returns only `tool_use` blocks (no text), the fallback `"Done! I updated your data."` is used instead of Claude's actual response. Multi-turn tool use (where Claude chains multiple calls) is impossible.
- **Fix:** After dispatching tool calls, send a follow-up request with `tool_result` blocks, then extract the final text response from that.

#### BUG-06: API key shipped in client bundle
- **Files:** `lib/claude.ts:8`, `lib/meal-scanner.ts:5`
- **Problem:** `EXPO_PUBLIC_CLAUDE_API_KEY` is embedded in the JavaScript bundle at build time. Anyone can extract it from the app binary via `strings` or a JS decompiler. This is a billing and abuse risk.
- **Fix:** Proxy all Claude API calls through a backend server (Supabase Edge Function, etc.).

---

### HIGH (P1) — Functional Bugs

#### BUG-07: Auth listener leak on repeated `initialize()` calls
- **File:** `stores/useAuthStore.ts:30-32`
- **Problem:** `onAuthStateChange()` registers a new listener every time `initialize()` is called. The returned `subscription` is never stored or unsubscribed. If `initialize()` runs twice (e.g., hot reload), duplicate listeners accumulate causing duplicate state updates.
- **Fix:** Store the subscription and call `.unsubscribe()` before creating a new one, or guard with a flag.

#### BUG-08: `sendUserMessage` never resets `isLoading` on error
- **File:** `stores/useChatStore.ts:185-238`
- **Problem:** If `buildSnapshot()` or `sendMessage()` throws an unexpected error, `isLoading` stays `true` permanently, freezing the chat UI. The `sendMessage` function catches internally and returns fallback text, but any error in the caller (e.g., a store getter throwing) is unhandled.
- **Fix:** Wrap the entire `sendUserMessage` body in try/finally to ensure `set({ isLoading: false })`.

#### BUG-09: Double navigation on login success
- **File:** `app/login.tsx:39`, `app/_layout.tsx:29-30`
- **Problem:** After successful auth, `login.tsx` calls `router.replace('/(tabs)')` AND `useProtectedRoute` detects the session change and also calls `router.replace('/(tabs)')`. This is a race condition — two navigations fire simultaneously.
- **Fix:** Remove `router.replace('/(tabs)')` from `login.tsx:39`. Let the auth guard handle it.

#### BUG-10: VolumeChart crashes on empty data
- **File:** `app/(tabs)/progress.tsx:72`
- **Problem:** `Math.max(...volumeData.map((d) => d.maxSets))` returns `-Infinity` when `volumeData` is empty (the new default). Then `d.sets / maxSets` divides by `-Infinity`, producing `NaN` bar heights.
- **Fix:** `Math.max(...volumeData.map((d) => d.maxSets), 1)` — add `1` as a fallback.

#### BUG-11: MStrengthCard progress bar overflows on empty data
- **File:** `app/(tabs)/progress.tsx:36`
- **Problem:** `mStrengthScore / mStrengthNextTier` is `0 / 0 = NaN` with initial state. The progress bar width becomes `NaN%`.
- **Fix:** Guard: `const progress = mStrengthNextTier > 0 ? mStrengthScore / mStrengthNextTier : 0`.

#### BUG-12: CalorieRing SVG overflows when calories exceed target
- **File:** `app/(tabs)/eat.tsx:14`
- **Problem:** `offset = circumference * (1 - progress)` goes negative when `consumed > calorieTarget`. `strokeDashoffset` with a negative value renders unpredictably.
- **Fix:** Clamp: `const clampedProgress = Math.min(progress, 1)`.

#### BUG-13: HRV value likely 1000x too high
- **File:** `lib/health.ts:57`
- **Problem:** `results[0].value * 1000` converts "seconds to ms" but HealthKit's `HeartRateVariabilitySDNN` already reports in milliseconds. This multiplies 42ms to 42,000ms, inflating the readiness score to max.
- **Fix:** Remove the `* 1000`: `return Math.round(results[0].value)`.

#### BUG-14: Timezone bug in "today" queries
- **Files:** `lib/api.ts:32-33`, `lib/api.ts:86-87`
- **Problem:** `today.setHours(0, 0, 0, 0)` uses local timezone, but `.toISOString()` converts to UTC. In UTC-8 at 10 PM local, "midnight local" becomes 8 AM UTC, so the query misses workouts/meals created before 8 AM UTC that day.
- **Fix:** Use UTC-based date construction, or use Supabase's timezone-aware date filtering.

#### BUG-15: `calorieTarget` duplicated across two stores with no sync
- **Files:** `stores/useUserStore.ts` (`calorieTarget: 2000`), `stores/useNutritionStore.ts` (`calorieTarget: 2000`)
- **Problem:** Settings screen reads from `useUserStore`, Eat screen reads from `useNutritionStore`. AI tool `update_nutrition_targets` updates nutrition store only; `update_profile` updates user store only. These drift.
- **Fix:** Single source of truth — either keep it in one store and derive in the other, or sync them whenever either updates.

#### BUG-16: `updateKeyLift` silently fails on empty keyLifts array
- **File:** `stores/useProgressStore.ts:60-65`
- **Problem:** `.map()` on an empty `keyLifts` array matches nothing. The AI tool `update_key_lift` always no-ops until lifts are loaded from Supabase (which never happens — see BUG-01).
- **Fix:** If no matching lift exists, push a new entry instead of only mapping existing ones.

#### BUG-17: Rest timer effect recreated every second
- **File:** `app/(tabs)/index.tsx:99-105`
- **Problem:** `useEffect` deps include `restTimerSeconds`. Since it changes every second, the interval is torn down and recreated every second, causing timing drift.
- **Fix:** Remove `restTimerSeconds` from deps. Only depend on `isRestTimerRunning`.

#### BUG-18: `handleLoggerClose` always starts rest timer, even when no set was logged
- **File:** `app/(tabs)/index.tsx:153-157`
- **Problem:** Dismissing the SetLogger modal without logging (tapping backdrop) still calls `startRestTimer()`.
- **Fix:** Pass a `didLog` flag from SetLogger, only start timer if true.

#### BUG-19: `signOut` has no error handling
- **File:** `stores/useAuthStore.ts:76-79`
- **Problem:** If `supabase.auth.signOut()` throws, stores are never reset and session is not cleared locally.
- **Fix:** Wrap in try/catch; always clear local state even if network call fails.

#### BUG-20: `updateProfile` accepts function keys via `Partial<UserState>`
- **File:** `stores/useUserStore.ts:15`
- **Problem:** `Partial<UserState>` includes `updateProfile`, `toggleProgressiveOverload`, and `reset` as valid keys. A bad tool call could overwrite store actions with data.
- **Fix:** Create a separate `UserData` interface for data-only fields and use `Partial<UserData>`.

---

### MEDIUM (P2) — Non-Ideal Behavior

#### BUG-21: Integration status always shows "Connected"
- **File:** `app/(tabs)/settings.tsx:86-93`
- **Problem:** `StatusDot` is hardcoded with green dot + "Connected". It never reads `integrations` from `useUserStore`.
- **Fix:** Read `integrations` from store, conditionally render status.

#### BUG-22: Settings rows are display-only (not tappable)
- **File:** `app/(tabs)/settings.tsx:123-131`
- **Problem:** Training Split, Rest Timer, Calorie Target, Macro Split show values with chevrons (suggesting tap-to-edit) but have no `onPress`.
- **Fix:** Add edit flows or remove chevrons.

#### BUG-23: ProfileCard is not tappable
- **File:** `app/(tabs)/settings.tsx:12`
- **Problem:** Wrapped in `Pressable` with a chevron arrow but no `onPress` handler.
- **Fix:** Add navigation to a profile edit screen, or remove the chevron.

#### BUG-24: "History" button on Train screen is dead
- **File:** `app/(tabs)/index.tsx:164`
- **Problem:** `Pressable` has no `onPress` handler.
- **Fix:** Add workout history screen or remove the button.

#### BUG-25: PeriodSelector does nothing
- **File:** `app/(tabs)/progress.tsx:9-31`
- **Problem:** `setPeriod` changes state but no data-fetching or filtering logic reads the `period` value.
- **Fix:** Wire period to filter/re-fetch progress data.

#### BUG-26: Chat "Workout loaded" indicator is always green
- **File:** `app/(tabs)/chat.tsx:80-84`
- **Problem:** Always shows green dot + "Workout loaded" even when `workoutName` is `''` and `exercises` is `[]`.
- **Fix:** Conditionally show based on `workoutName !== ''`.

#### BUG-27: Context pill shows " · Day 0" when no workout loaded
- **File:** `app/(tabs)/chat.tsx:91`
- **Problem:** Template `{workoutName} · Day {dayNumber}` renders ` · Day 0` with empty state.
- **Fix:** Conditionally render or show a fallback like "No workout loaded".

#### BUG-28: Eat screen shows negative protein remaining
- **File:** `app/(tabs)/eat.tsx:100-131`
- **Problem:** `proteinLeft = proteinTarget - totalProtein()` can be negative. Text reads "You need ~-20g more protein."
- **Fix:** `Math.max(proteinLeft, 0)` or show "Target reached" when exceeded.

#### BUG-29: Rapid chat messages cause race condition
- **File:** `stores/useChatStore.ts:196-235`
- **Problem:** Two rapid sends read `get().messages` concurrently before either response arrives. The second response's `set` can overwrite the first.
- **Fix:** Disable send while `isLoading` is true (already partially true in UI, but quick actions bypass it).

#### BUG-30: Meal scanner JSON parsing is fragile
- **File:** `lib/meal-scanner.ts:88-91`
- **Problem:** `text.match(/\{[\s\S]*\}/)` matches first `{` to last `}`. If Claude includes JSON examples in prose, this grabs the wrong substring. No validation of parsed fields.
- **Fix:** Use a more precise regex or structured output. Validate required fields after parsing.

#### BUG-31: `fetchProfile` has no explicit user filter
- **File:** `lib/api.ts:7-13`
- **Problem:** `.select('*').single()` with no `.eq('id', userId)`. Relies entirely on RLS policies. If RLS is misconfigured, returns wrong user.
- **Fix:** Add explicit `.eq('id', user.id)` like other queries.

#### BUG-32: `fetchNutritionTargets` same issue
- **File:** `lib/api.ts:133-139`
- **Problem:** Same as BUG-31 — no explicit user filter.

#### BUG-33: Schema mismatches between stores and database
- **Files:** Multiple
- **Details:**
  - `profiles.weight` is `text` in DB but `number` in store (type mismatch on load)
  - `exercises` table has no `weight` column (store field can't persist)
  - API uses `rpe` (`lib/api.ts:69`) but store uses `rir` (conceptual mismatch)
  - `FoodItem` in store has `{name, calories}` but DB food_items has per-item macros
  - `trainingSplit`, `macroSplit`, `restTimerMode` have no DB columns in `profiles`
  - Nutrition store defaults to 2000 kcal but DB defaults to 2800 kcal

#### BUG-34: Unused `Circle` import in camera.tsx
- **File:** `app/camera.tsx:6`
- **Problem:** `Circle` is imported from `react-native-svg` but never used.
- **Fix:** Remove the import.

#### BUG-35: `@anthropic-ai/sdk` is unused
- **File:** `package.json`
- **Problem:** SDK package is installed (~200KB) but never imported. The codebase uses raw `fetch`.
- **Fix:** Remove from dependencies.

---

## Part 2 — Screen & Feature Completeness Audit

### Existing Screens

| Screen | File | Status | Notes |
|--------|------|--------|-------|
| Login/Signup | `app/login.tsx` | **Partial** | Auth works but no email validation, no forgot password, no onboarding after signup |
| Train | `app/(tabs)/index.tsx` | **Broken** | Shows blank state (no workout data loads). SetLogger works for local-only logging. Rest timer has drift bug. History button dead. |
| Chat | `app/(tabs)/chat.tsx` | **Partial** | AI responds but tool-use protocol is incomplete (no tool_result). Quick actions work. Context pill shows empty state. |
| Eat | `app/(tabs)/eat.tsx` | **Broken** | Shows 0 kcal with no meals (nothing loads from DB). Calorie ring has overflow bug. Negative protein text possible. |
| Progress | `app/(tabs)/progress.tsx` | **Broken** | All zeros/empty. VolumeChart and MStrengthCard have NaN/crash bugs on empty data. Period selector is non-functional. |
| Settings | `app/(tabs)/settings.tsx` | **Partial** | Profile shows empty data. Only Progressive Overload toggle and Sign Out work. All other rows are display-only. Integration status hardcoded. |
| Camera/Meal Scanner | `app/camera.tsx` | **Working** | Camera + Claude Vision analysis works. Meals add to local store but don't persist. |
| 404 | `app/+not-found.tsx` | **Working** | Minimal but functional. |

### Missing Screens & Features

#### Priority 1 — Required for MVP

| Feature | Description |
|---------|-------------|
| **Onboarding flow** | After signup: collect height, weight, goals, experience level, training split preference, calorie/macro targets. Currently the user goes straight to empty screens. The `isOnboarded` flag in auth store exists but is dead code. |
| **Data hydration layer** | `useAppSync` must call `fetchProfile`, `fetchTodayWorkout`, `fetchTodayMeals`, `fetchNutritionTargets`, `fetchKeyLifts`, `fetchBodyMetrics` on login and populate stores. This is the single biggest missing piece. |
| **Data persistence layer** | Every store mutation must also fire the corresponding Supabase write. Without this, the app is stateless across sessions. |
| **Profile edit screen** | Settings ProfileCard has a chevron suggesting navigation but no destination. Users need to edit name, height, weight, goals. |
| **Workout creation / selection** | No way to create or pick a workout. The Train screen assumes a workout is loaded but there is no loader. Need a workout template browser and/or "start workout" flow. |

#### Priority 2 — Expected Features

| Feature | Description |
|---------|-------------|
| **Workout history** | History button exists but is dead. Need a screen showing past workouts with dates, exercises, volume. |
| **Manual meal logging** | Currently only via camera or AI chat. Need a manual food entry form with search. |
| **Edit/delete meals** | No way to remove or modify a logged meal. |
| **Forgot password** | No password reset flow. |
| **Account deletion** | No account deletion option (required by App Store guidelines). |
| **Notification settings** | No push notification configuration for rest timers, workout reminders, etc. |
| **Units preference** | Hardcoded to lbs. Need kg/lbs toggle. |
| **Complete tool-use loop** | Send `tool_result` back to Claude so it can generate proper confirmation text and chain tool calls. |

#### Priority 3 — Nice-to-Have

| Feature | Description |
|---------|-------------|
| **Progress photos** | Camera integration exists for meals but not body progress photos. |
| **Workout templates** | Predefined workout programs (PPL, Upper/Lower, etc.) that users can select. |
| **Exercise library** | Searchable exercise database with muscle group filters. |
| **Body measurement tracking** | Beyond weight — waist, chest, arms, etc. |
| **Charts / graphs** | Weight over time, lift progression, calorie trends. The infrastructure (`fetchBodyMetrics`, `fetchHealthHistory`) exists in the API but nothing renders it. |
| **Social / sharing** | Share workouts, progress, streaks. |
| **Dark/light mode toggle** | Currently dark-only. |
| **Export data** | CSV export of workout and nutrition history. |
| **Offline queue** | Persist actions when offline and sync when back online. |

---

## Part 3 — Recommended Implementation Order

### Phase 1: Make the app functional (fix critical bugs)

1. **Wire data hydration in `useAppSync`** — Call all `fetch*` functions from `lib/api.ts` and populate stores on login. This single change makes every screen show real data. (Fixes BUG-01, BUG-02)
2. **Wire data persistence in stores** — Each store action calls its corresponding API write. (Fixes BUG-03)
3. **Fix splash screen race condition** — Await `initialize()` before hiding splash. (Fixes BUG-04)
4. **Remove double navigation** — Delete `router.replace` from `login.tsx`. (Fixes BUG-09)
5. **Fix empty-state crashes** — Guard VolumeChart, MStrengthCard, CalorieRing against zero/empty data. (Fixes BUG-10, BUG-11, BUG-12)
6. **Fix `sendUserMessage` error handling** — Add try/finally around isLoading. (Fixes BUG-08)
7. **Fix auth listener leak** — Store and clean up onAuthStateChange subscription. (Fixes BUG-07)

### Phase 2: Complete the core experience

8. **Build onboarding flow** — 3-4 screens after signup: profile info → training preferences → nutrition targets → done. Writes to Supabase, populates stores.
9. **Build profile edit screen** — Navigation from Settings ProfileCard.
10. **Build workout selection/creation** — Template picker or manual creation. Load into workout store.
11. **Complete Claude tool-use loop** — Send tool_result follow-ups for proper AI responses. (Fixes BUG-05)
12. **Fix schema mismatches** — Align store types with DB columns. (Fixes BUG-33)
13. **Fix remaining medium bugs** — Negative protein text, hardcoded integrations, dead buttons, etc.

### Phase 3: Polish and missing features

14. **Workout history screen**
15. **Manual meal logging form**
16. **Edit/delete meals**
17. **Forgot password flow**
18. **Account deletion** (App Store requirement)
19. **Units preference (kg/lbs)**
20. **Move API keys to backend** (Fixes BUG-06)
21. **Progress charts/graphs**
22. **Fix HRV multiplication** (Fixes BUG-13)
23. **Fix timezone queries** (Fixes BUG-14)
24. **Notification settings**
25. **Offline queue / retry logic**

---

## Appendix: Full Bug Index

| ID | Severity | File | Line(s) | Summary |
|----|----------|------|---------|---------|
| BUG-01 | P0 | All stores, useAppSync | — | No data loads from Supabase |
| BUG-02 | P0 | useAuthStore, useAppSync | 57-61 | Profile empty after signup |
| BUG-03 | P0 | All stores | — | No data persists to Supabase |
| BUG-04 | P0 | app/_layout.tsx | 54-58 | Splash hides before auth resolves |
| BUG-05 | P0 | lib/claude.ts | 128-156 | No tool_result follow-up |
| BUG-06 | P0 | lib/claude.ts, lib/meal-scanner.ts | 8, 5 | API key in client bundle |
| BUG-07 | P1 | stores/useAuthStore.ts | 30-32 | Auth listener leak |
| BUG-08 | P1 | stores/useChatStore.ts | 185-238 | isLoading stuck on error |
| BUG-09 | P1 | app/login.tsx | 39 | Double navigation |
| BUG-10 | P1 | app/(tabs)/progress.tsx | 72 | VolumeChart -Infinity crash |
| BUG-11 | P1 | app/(tabs)/progress.tsx | 36 | MStrengthCard NaN progress |
| BUG-12 | P1 | app/(tabs)/eat.tsx | 14 | CalorieRing negative offset |
| BUG-13 | P1 | lib/health.ts | 57 | HRV 1000x too high |
| BUG-14 | P1 | lib/api.ts | 32-33, 86-87 | Timezone bug in queries |
| BUG-15 | P1 | useUserStore, useNutritionStore | — | Duplicate calorieTarget |
| BUG-16 | P1 | stores/useProgressStore.ts | 60-65 | updateKeyLift no-ops on empty |
| BUG-17 | P1 | app/(tabs)/index.tsx | 99-105 | Rest timer effect drift |
| BUG-18 | P1 | app/(tabs)/index.tsx | 153-157 | Rest timer starts without logging |
| BUG-19 | P1 | stores/useAuthStore.ts | 76-79 | signOut no error handling |
| BUG-20 | P1 | stores/useUserStore.ts | 15 | updateProfile accepts function keys |
| BUG-21 | P2 | app/(tabs)/settings.tsx | 86-93 | Integration status hardcoded |
| BUG-22 | P2 | app/(tabs)/settings.tsx | 123-131 | Settings rows not tappable |
| BUG-23 | P2 | app/(tabs)/settings.tsx | 12 | ProfileCard not tappable |
| BUG-24 | P2 | app/(tabs)/index.tsx | 164 | History button dead |
| BUG-25 | P2 | app/(tabs)/progress.tsx | 9-31 | PeriodSelector no-op |
| BUG-26 | P2 | app/(tabs)/chat.tsx | 80-84 | "Workout loaded" always shown |
| BUG-27 | P2 | app/(tabs)/chat.tsx | 91 | Context pill shows empty state |
| BUG-28 | P2 | app/(tabs)/eat.tsx | 100-131 | Negative protein remaining |
| BUG-29 | P2 | stores/useChatStore.ts | 196-235 | Rapid message race condition |
| BUG-30 | P2 | lib/meal-scanner.ts | 88-91 | Fragile JSON parsing |
| BUG-31 | P2 | lib/api.ts | 7-13 | fetchProfile no user filter |
| BUG-32 | P2 | lib/api.ts | 133-139 | fetchNutritionTargets no user filter |
| BUG-33 | P2 | Multiple | — | Schema mismatches (6 items) |
| BUG-34 | P3 | app/camera.tsx | 6 | Unused Circle import |
| BUG-35 | P3 | package.json | — | Unused @anthropic-ai/sdk |
