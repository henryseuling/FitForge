import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_DEFAULT_MODEL = Deno.env.get('ANTHROPIC_MODEL') || 'claude-sonnet-4-6';
const ANTHROPIC_WORKOUT_MODEL = Deno.env.get('ANTHROPIC_WORKOUT_MODEL') || 'claude-opus-4-6';
const ANTHROPIC_VISION_MODEL = Deno.env.get('ANTHROPIC_VISION_MODEL') || ANTHROPIC_DEFAULT_MODEL;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const PER_MINUTE_LIMIT = 20;
const PER_DAY_LIMIT = 250;

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function callAnthropic(payload: Record<string, unknown>) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Missing ANTHROPIC_API_KEY secret');
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

async function callAnthropicWithFallback(
  payload: Record<string, unknown>,
  fallbackModel?: string
) {
  try {
    return await callAnthropic(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const requestedModel = typeof payload.model === 'string' ? payload.model : null;
    const shouldFallback =
      Boolean(fallbackModel) &&
      requestedModel !== fallbackModel &&
      (
        message.includes('invalid_request_error') ||
        message.includes('not_found_error') ||
        message.includes('permission_error') ||
        message.includes('model') ||
        message.includes('not found') ||
        message.includes('not available')
      );

    if (!shouldFallback) {
      throw error;
    }

    console.warn(`Anthropic model fallback from ${requestedModel} to ${fallbackModel}: ${message}`);
    return callAnthropic({
      ...payload,
      model: fallbackModel,
    });
  }
}

function resolveModel(modelPreference: unknown, task: unknown) {
  if (modelPreference === 'workout') {
    return ANTHROPIC_WORKOUT_MODEL;
  }

  if (modelPreference === 'vision' || task === 'vision') {
    return ANTHROPIC_VISION_MODEL;
  }

  return ANTHROPIC_DEFAULT_MODEL;
}

async function requireAuthenticatedUser(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Missing authorization header');
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new HttpError(500, 'Missing Supabase runtime configuration');
  }

  const token = authorization.replace('Bearer ', '').trim();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError(401, 'Unauthorized');
  }
  return data.user;
}

function createAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new HttpError(500, 'Missing Supabase runtime configuration');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function clampMaxTokens(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.round(value), 128), 4096);
}

function getUsageMetrics(data: any) {
  const usage = data?.usage ?? {};
  return {
    inputTokens: typeof usage.input_tokens === 'number' ? usage.input_tokens : null,
    outputTokens: typeof usage.output_tokens === 'number' ? usage.output_tokens : null,
  };
}

async function enforceRateLimits(userId: string) {
  const supabase = createAdminClient();
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();

  const [{ count: minuteCount, error: minuteError }, { count: dayCount, error: dayError }] = await Promise.all([
    supabase
      .from('ai_request_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', minuteAgo),
    supabase
      .from('ai_request_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', dayAgo),
  ]);

  if (minuteError || dayError) {
    throw new HttpError(500, 'Failed to check AI usage limits');
  }

  if ((minuteCount ?? 0) >= PER_MINUTE_LIMIT) {
    throw new HttpError(429, 'AI rate limit exceeded. Please wait a minute and try again.');
  }

  if ((dayCount ?? 0) >= PER_DAY_LIMIT) {
    throw new HttpError(429, 'Daily AI limit reached. Please try again tomorrow.');
  }
}

async function logAIRequest(params: {
  userId: string;
  task: string;
  requestId: string;
  success: boolean;
  statusCode: number;
  latencyMs: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  toolCount?: number;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = createAdminClient();
    await supabase.from('ai_request_logs').insert({
      user_id: params.userId,
      task: params.task,
      request_id: params.requestId,
      success: params.success,
      status_code: params.statusCode,
      latency_ms: params.latencyMs,
      input_tokens: params.inputTokens ?? null,
      output_tokens: params.outputTokens ?? null,
      tool_count: params.toolCount ?? 0,
      error_message: params.errorMessage ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (_error) {
    // Logging must never break the main response path.
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestStartedAt = Date.now();
    const requestId = crypto.randomUUID();
    const user = await requireAuthenticatedUser(request);
    await enforceRateLimits(user.id);

    const body = await request.json();
    const task = body?.task;
    const model = resolveModel(body?.modelPreference, task);
    const metadata = {
      hasTools: Array.isArray(body?.tools) && body.tools.length > 0,
      messageCount: Array.isArray(body?.messages) ? body.messages.length : 0,
      maxTokens: clampMaxTokens(body?.maxTokens, 1024),
      model,
    };

    switch (task) {
      case 'chat': {
        const data = await callAnthropicWithFallback({
          model,
          max_tokens: metadata.maxTokens,
          system: body.systemPrompt,
          tools: body.tools ?? [],
          messages: body.messages ?? [],
        }, ANTHROPIC_DEFAULT_MODEL);
        const usage = getUsageMetrics(data);
        await logAIRequest({
          userId: user.id,
          task,
          requestId,
          success: true,
          statusCode: 200,
          latencyMs: Date.now() - requestStartedAt,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          toolCount: Array.isArray(body.tools) ? body.tools.length : 0,
          metadata,
        });
        return json({ content: data.content ?? [] });
      }

      case 'chat_follow_up': {
        const messages = Array.isArray(body.messages) ? [...body.messages] : [];
        messages.push({
          role: 'assistant',
          content: body.toolCalls ?? [],
        });
        messages.push({
          role: 'user',
          content: body.toolResults ?? [],
        });

        const data = await callAnthropicWithFallback({
          model,
          max_tokens: metadata.maxTokens,
          system: body.systemPrompt,
          tools: body.tools ?? [],
          messages,
        }, ANTHROPIC_DEFAULT_MODEL);
        const usage = getUsageMetrics(data);
        await logAIRequest({
          userId: user.id,
          task,
          requestId,
          success: true,
          statusCode: 200,
          latencyMs: Date.now() - requestStartedAt,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          toolCount: Array.isArray(body.toolCalls) ? body.toolCalls.length : 0,
          metadata: {
            ...metadata,
            toolResultCount: Array.isArray(body.toolResults) ? body.toolResults.length : 0,
          },
        });
        return json({ content: data.content ?? [] });
      }

      case 'completion': {
        const data = await callAnthropicWithFallback({
          model,
          max_tokens: metadata.maxTokens,
          system: body.systemPrompt,
          messages: [{ role: 'user', content: body.userMessage }],
        }, ANTHROPIC_DEFAULT_MODEL);
        const text = (data.content ?? [])
          .filter((block: { type?: string }) => block.type === 'text')
          .map((block: { text?: string }) => block.text ?? '')
          .join('');
        const usage = getUsageMetrics(data);
        await logAIRequest({
          userId: user.id,
          task,
          requestId,
          success: true,
          statusCode: 200,
          latencyMs: Date.now() - requestStartedAt,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          metadata,
        });
        return json({ text });
      }

      case 'vision': {
        const data = await callAnthropicWithFallback({
          model,
          max_tokens: metadata.maxTokens,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: body.mediaType || 'image/jpeg',
                    data: body.imageBase64,
                  },
                },
                {
                  type: 'text',
                  text: body.prompt,
                },
              ],
            },
          ],
        }, ANTHROPIC_DEFAULT_MODEL);
        const text = (data.content ?? [])
          .filter((block: { type?: string }) => block.type === 'text')
          .map((block: { text?: string }) => block.text ?? '')
          .join('');
        const usage = getUsageMetrics(data);
        await logAIRequest({
          userId: user.id,
          task,
          requestId,
          success: true,
          statusCode: 200,
          latencyMs: Date.now() - requestStartedAt,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          metadata: {
            ...metadata,
            mediaType: typeof body.mediaType === 'string' ? body.mediaType : 'image/jpeg',
          },
        });
        return json({ text });
      }

      default:
        return json({ error: 'Unsupported AI task' }, 400);
    }
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const authorization = request.headers.get('Authorization');
    if (authorization?.startsWith('Bearer ')) {
      try {
        const user = await requireAuthenticatedUser(request);
        await logAIRequest({
          userId: user.id,
          task: 'unknown',
          requestId: crypto.randomUUID(),
          success: false,
          statusCode: status,
          latencyMs: 0,
          errorMessage: error instanceof Error ? error.message : 'Unknown AI gateway error',
        });
      } catch (_loggingError) {
        // Ignore auth/logging failures in the error path.
      }
    }
    return json(
      {
        error: error instanceof Error ? error.message : 'Unknown AI gateway error',
      },
      status
    );
  }
});
