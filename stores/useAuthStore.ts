import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { useUserStore } from './useUserStore';
import { useWorkoutStore } from './useWorkoutStore';
import { useNutritionStore } from './useNutritionStore';
import { useProgressStore } from './useProgressStore';
import { useChatStore } from './useChatStore';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isOnboarded: boolean;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: string | null }>;
  setOnboarded: (value: boolean) => void;
}

function resetAllStores() {
  useUserStore.getState().reset();
  useWorkoutStore.getState().reset();
  useNutritionStore.getState().reset();
  useProgressStore.getState().reset();
  useChatStore.getState().reset();
}

let authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  isOnboarded: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Check if user has completed onboarding by checking if profile has level set
      let onboarded = false;
      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('level')
            .eq('id', session.user.id)
            .single();
          onboarded = !!profile?.level;
        } catch {
          // Profile may not exist yet
        }
      }

      set({ session, user: session?.user ?? null, isLoading: false, isOnboarded: onboarded });

      // Clean up previous listener if any
      if (authSubscription) {
        authSubscription.unsubscribe();
      }

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });
      });
      authSubscription = subscription;
    } catch {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) return { error: error.message };

    resetAllStores();
    set({ session: data.session, user: data.user, isOnboarded: false });

    // Ensure profile row exists with the user's name
    if (data.user) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        // Load the full profile back and populate user store
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        if (profile) {
          useUserStore.getState().setProfile(profile);
        }
      } catch (err) { console.warn('Failed to create/load profile after sign up:', err); }
    }

    return { error: null };
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error: error.message };

    // Check onboarding status for returning users
    let onboarded = false;
    if (data.user) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('level')
          .eq('id', data.user.id)
          .single();
        onboarded = !!profile?.level;
      } catch {
        // Profile check failed — will route to onboarding
      }
    }

    set({ session: data.session, user: data.user, isOnboarded: onboarded });
    resetAllStores();
    return { error: null };
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Always clear local state even if network call fails
    }
    resetAllStores();
    set({ session: null, user: null, isOnboarded: false });
  },

  deleteAccount: async () => {
    try {
      // Call Supabase Edge Function or RPC to delete the user's data and auth account
      const { error } = await supabase.rpc('delete_user_account');
      if (error) {
        if (error.message?.includes("Could not find the function public.delete_user_account")) {
          return { error: 'Account deletion is not enabled on this backend yet. The Supabase delete_user_account RPC still needs to be deployed.' };
        }
        return { error: error.message };
      }
      resetAllStores();
      set({ session: null, user: null, isOnboarded: false });
      return { error: null };
    } catch (e: any) {
      return { error: e?.message || 'Failed to delete account' };
    }
  },

  setOnboarded: (value) => set({ isOnboarded: value }),
}));
