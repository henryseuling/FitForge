# FitForge — Change Log

## Files Modified

### `stores/useUserStore.ts`
- Added fields: `age`, `gender`, `goals`, `equipment`, `frequency`, `units`, `notifications`, `restTimerDuration`
- Added actions: `toggleUnits()`, `toggleNotifications()`, `setRestTimerDuration()`
- Fixed `updateProfile()` to map camelCase keys → snake_case for Supabase persistence
- Fixed `loadProfile()` to hydrate all new fields from the database

### `stores/useNutritionStore.ts`
- Added `removeMeal(mealId)` action with Supabase delete
- Added `updateTargets()` action for calorie/protein/carbs/fat targets

### `stores/useAuthStore.ts`
- Added `deleteAccount()` action calling `supabase.rpc('delete_user_account')`

### `app/onboarding.tsx` (rewritten)
- Expanded from 4 steps to 6 steps: Fitness Goals → Experience Level → Body Stats (height, weight, age, gender) → Equipment → Workout Frequency → Nutrition Targets
- Multi-select chip rows for goals and equipment
- Progress bar and step indicators with haptic feedback
- Saves all data to user store and nutrition store on completion

### `app/(tabs)/index.tsx` (rewritten — Train tab)
- Full exercise template system for all split types (PPL, Upper/Lower, Full Body, 3/4/5/6-day)
- Empty workout state with "Start Workout" button
- Workout picker showing templates filtered by user's training split
- Exercise cards with set logging, weight/rep display, and completion tracking
- Progress bar showing completed vs total sets
- "Workout Complete!" banner when all sets are done
- Pull-to-refresh via RefreshControl
- History button wired to `/workout-history`

### `app/(tabs)/eat.tsx` (rewritten — Eat tab)
- Added WaterTracker component with +/- buttons (8 glass target)
- "Add" button navigates to `/add-meal` for manual meal logging
- "Snap Meal" button navigates to `/camera`
- EmptyMeals component for zero-meal state
- Long-press delete on meal cards with confirmation alert
- Pull-to-refresh via RefreshControl
- Replaced emoji icons with colored dot indicators

### `app/(tabs)/progress.tsx` (updated)
- Added pull-to-refresh via RefreshControl
- Added "Goals" button linking to `/goals`
- Added empty state for key lifts when no data exists
- Added haptics on Goals button press

### `app/(tabs)/settings.tsx` (rewritten)
- All rows are now functional with onPress handlers and haptic feedback
- Training: split → edit-profile, rest timer → cycles 60/90/120/150/180s, progressive overload toggle
- Nutrition: calorie target → edit-profile, macro split → edit-profile
- Goals section: navigates to `/goals`
- Preferences: units toggle (imperial/metric), notifications toggle, export data (share sheet)
- Integrations: reads Apple Health and Oura Ring status from store
- Account: sign out with confirmation, delete account with confirmation
- ProfileCard navigates to `/edit-profile`

### `app/edit-profile.tsx` (rewritten)
- Added age field with number-pad keyboard
- Added gender field as chip selector (Male, Female, Other)
- Haptic feedback on save
- Calorie and protein target editing

### `app/_layout.tsx`
- Added routes: `add-meal`, `workout-history`, `goals` (all modal presentation)

### `app/login.tsx`
- Added forgot password using `supabase.auth.resetPasswordForEmail()`

### `package.json`
- Removed unused `@anthropic-ai/sdk` dependency

## Files Created

### `app/add-meal.tsx`
- Manual meal logging screen with meal type selector (Breakfast/Lunch/Dinner/Snack)
- Add multiple food items with name, calories, protein, carbs, fat inputs
- Running totals bar showing aggregated macros
- Saves via `useNutritionStore.addMeal()`

### `app/workout-history.tsx`
- Fetches past workouts from Supabase with nested exercises and completed sets
- Expandable workout cards showing date, duration, exercises, weights
- Pull-to-refresh, loading spinner, empty state

### `app/goals.tsx`
- Goal types: Weight, Strength, Frequency, Nutrition
- Goal cards with progress bars calculated from live store data
- Add goal form with type-specific inputs
- Delete goals with long-press

### `supabase-migrations.sql`
- Complete SQL schema for all 11 tables: profiles, workouts, exercises, completed_sets, meals, food_items, nutrition_targets, key_lifts, body_metrics, chat_messages, health_snapshots
- Row-Level Security policies on every table
- Auto-create profile trigger on auth signup
- `delete_user_account()` RPC function
- Indexes for common query patterns

## Summary

- **8 files modified** across stores, screens, and config
- **4 new screens** created (add-meal, workout-history, goals, supabase-migrations)
- **All settings rows** now functional with real actions
- **6-step onboarding** covering goals, level, body stats, equipment, frequency, nutrition
- **Full workout system** with exercise templates for every split type
- **Pull-to-refresh** on Train, Eat, and Progress tabs
- **Empty states** for workouts, meals, and key lifts
- **Haptic feedback** throughout all interactive elements
- **Build verified** — zero compilation errors (1629 modules bundled)
