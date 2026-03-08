import { supabase } from './supabase';
import { useAuthStore } from '@/stores/useAuthStore';

interface GatewayEnvelope<T> {
  data: T;
}

export type AIModelPreference = 'default' | 'workout' | 'vision';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  if (!error || typeof error !== 'object') {
    return 'AI gateway request failed';
  }

  const baseMessage =
    'message' in error && typeof error.message === 'string' ? error.message : 'AI gateway request failed';
  const name = 'name' in error && typeof error.name === 'string' ? error.name : 'FunctionsError';
  const context = 'context' in error ? (error as { context?: unknown }).context : undefined;

  if (!(context instanceof Response)) {
    return `${name}: ${baseMessage}`;
  }

  const status = context.status;
  let details = '';

  try {
    const cloned = context.clone();
    const contentType = cloned.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const json = await cloned.json();
      details = typeof json === 'string' ? json : JSON.stringify(json);
    } else {
      details = await cloned.text();
    }
  } catch {
    details = '';
  }

  const trimmedDetails = details.trim();
  return trimmedDetails
    ? `${name} ${status}: ${trimmedDetails}`
    : `${name} ${status}: ${baseMessage}`;
}

async function invokeAIGateway<T>(body: Record<string, unknown>): Promise<T> {
  const authStoreSession = useAuthStore.getState().session;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let activeSession = session ?? authStoreSession;
  const expiresAt = activeSession?.expires_at ? activeSession.expires_at * 1000 : null;
  const isExpired = expiresAt != null && expiresAt <= Date.now() + 30_000;

  if ((!activeSession?.access_token || isExpired) && activeSession?.refresh_token) {
    const {
      data: { session: refreshedSession },
    } = await supabase.auth.refreshSession({
      refresh_token: activeSession.refresh_token,
    });

    if (refreshedSession) {
      activeSession = refreshedSession;
      useAuthStore.setState({ session: refreshedSession, user: refreshedSession.user });
    }
  }

  if (!activeSession?.access_token) {
    throw new Error('No active session for AI request. Sign out and sign back in, then try again.');
  }

  const { data: authSessionData, error: setSessionError } = await supabase.auth.setSession({
    access_token: activeSession.access_token,
    refresh_token: activeSession.refresh_token,
  });

  if (setSessionError && activeSession.refresh_token) {
    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await supabase.auth.refreshSession({
      refresh_token: activeSession.refresh_token,
    });

    if (refreshError || !refreshedSession?.access_token) {
      throw new Error('Your session expired. Sign out and sign back in, then try chat again.');
    }

    activeSession = refreshedSession;
    useAuthStore.setState({ session: refreshedSession, user: refreshedSession.user });
  } else if (authSessionData.session) {
    activeSession = authSessionData.session;
    useAuthStore.setState({ session: authSessionData.session, user: authSessionData.session.user });
  }

  const { error: sessionValidationError } = await supabase.auth.getUser(activeSession.access_token);
  if (sessionValidationError) {
    throw new Error('Your session is invalid. Sign out and sign back in, then try chat again.');
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase configuration for AI gateway');
  }

  let data: GatewayEnvelope<T> | T | null = null;

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-gateway`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${activeSession.access_token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let details = '';
      try {
        const cloned = response.clone();
        const contentType = cloned.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          details = JSON.stringify(await cloned.json());
        } else {
          details = await cloned.text();
        }
      } catch {
        details = '';
      }

      const message = details.trim()
        ? `AI gateway ${response.status}: ${details}`
        : `AI gateway ${response.status}: request failed`;
      console.error('AI gateway direct fetch error:', message);
      throw new Error(message);
    }

    data = (await response.json()) as GatewayEnvelope<T> | T;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('AI gateway ')) {
      throw error;
    }

    const detailedMessage = await extractFunctionErrorMessage(error);
    console.error('AI gateway error detail:', detailedMessage, error);
    throw new Error(detailedMessage);
  }

  if (!data) {
    throw new Error('AI gateway returned no data');
  }

  if (typeof data === 'object' && data !== null && 'data' in data) {
    return (data as GatewayEnvelope<T>).data;
  }

  return data as T;
}

export async function invokeChatAI(body: {
  systemPrompt: string;
  tools?: unknown[];
  messages: unknown[];
  maxTokens?: number;
  modelPreference?: AIModelPreference;
}) {
  return invokeAIGateway<{
    content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>;
  }>({
    task: 'chat',
    ...body,
  });
}

export async function invokeToolFollowUpAI(body: {
  systemPrompt: string;
  tools?: unknown[];
  messages: unknown[];
  toolCalls: unknown[];
  toolResults: unknown[];
  maxTokens?: number;
  modelPreference?: AIModelPreference;
}) {
  return invokeAIGateway<{
    content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>;
  }>({
    task: 'chat_follow_up',
    ...body,
  });
}

export async function invokeCompletionAI(body: {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  modelPreference?: AIModelPreference;
}) {
  return invokeAIGateway<{ text: string }>({
    task: 'completion',
    ...body,
  });
}

export async function invokeVisionAI(body: {
  prompt: string;
  imageBase64: string;
  mediaType?: string;
  maxTokens?: number;
  modelPreference?: AIModelPreference;
}) {
  return invokeAIGateway<{ text: string }>({
    task: 'vision',
    ...body,
  });
}
