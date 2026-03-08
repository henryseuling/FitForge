import { supabase } from './supabase';

interface GatewayEnvelope<T> {
  data: T;
}

export type AIModelPreference = 'default' | 'workout' | 'vision';

async function invokeAIGateway<T>(body: Record<string, unknown>): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No active session for AI request');
  }

  const { data, error } = await supabase.functions.invoke<GatewayEnvelope<T> | T>('ai-gateway', {
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(error.message || 'AI gateway request failed');
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
