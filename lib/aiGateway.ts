import { supabase } from './supabase';
import { useAuthStore } from '@/stores/useAuthStore';

interface GatewayEnvelope<T> {
  data: T;
}

export type AIModelPreference = 'default' | 'workout' | 'vision' | 'fast';

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

async function getAuthenticatedSession() {
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

  return activeSession;
}

async function invokeAIGateway<T>(body: Record<string, unknown>): Promise<T> {
  const activeSession = await getAuthenticatedSession();

  let data: GatewayEnvelope<T> | T | null = null;

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-gateway`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY!,
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

export interface StreamCallbacks {
  onToken?: (text: string) => void;
  onToolUse?: (block: { id: string; name: string; input: Record<string, unknown> }) => void;
  signal?: AbortSignal;
}

export async function invokeStreamingChatAI(
  body: {
    systemPrompt: string;
    tools?: unknown[];
    messages: unknown[];
    maxTokens?: number;
    modelPreference?: AIModelPreference;
  },
  callbacks: StreamCallbacks
): Promise<{
  content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>;
}> {
  const activeSession = await getAuthenticatedSession();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-gateway`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${activeSession.access_token}`,
    },
    body: JSON.stringify({ task: 'chat', stream: true, ...body }),
    signal: callbacks.signal,
  });

  if (!response.ok) {
    let details = '';
    try {
      details = await response.text();
    } catch {}
    throw new Error(details.trim() || `AI gateway ${response.status}: request failed`);
  }

  // If the gateway doesn't support streaming, fall back to JSON
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    const content = data?.data?.content ?? data?.content ?? (Array.isArray(data) ? data : []);
    // Emit all text blocks as tokens
    for (const block of content) {
      if (block.type === 'text' && block.text) {
        callbacks.onToken?.(block.text);
      }
    }
    return { content };
  }

  // Parse SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body for streaming');
  }

  const decoder = new TextDecoder();
  const contentBlocks: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }> = [];
  let currentToolBlock: { id: string; name: string; inputJson: string } | null = null;
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;

        let event: any;
        try {
          event = JSON.parse(payload);
        } catch {
          continue;
        }

        const eventType = event.type;

        if (eventType === 'content_block_start') {
          const block = event.content_block;
          if (block?.type === 'tool_use') {
            currentToolBlock = { id: block.id, name: block.name, inputJson: '' };
          }
        } else if (eventType === 'content_block_delta') {
          const delta = event.delta;
          if (delta?.type === 'text_delta' && delta.text) {
            callbacks.onToken?.(delta.text);
          } else if (delta?.type === 'input_json_delta' && delta.partial_json && currentToolBlock) {
            currentToolBlock.inputJson += delta.partial_json;
          }
        } else if (eventType === 'content_block_stop') {
          if (currentToolBlock) {
            let input: Record<string, unknown> = {};
            try {
              input = JSON.parse(currentToolBlock.inputJson);
            } catch {}
            const toolBlock = { type: 'tool_use' as const, id: currentToolBlock.id, name: currentToolBlock.name, input };
            contentBlocks.push(toolBlock);
            callbacks.onToolUse?.(toolBlock);
            currentToolBlock = null;
          }
        } else if (eventType === 'message_stop') {
          // Done
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { content: contentBlocks };
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
