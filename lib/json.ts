export function extractJsonPayload<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Continue to fallback strategies.
  }

  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as T;
    } catch {
      // Continue to fallback strategies.
    }
  }

  const jsonStart = text.search(/[\[{]/);
  if (jsonStart === -1) {
    throw new Error('No JSON payload found');
  }

  const startChar = text[jsonStart];
  const endChar = startChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let i = jsonStart; i < text.length; i += 1) {
    const ch = text[i];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escaping = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (ch === startChar) {
      depth += 1;
    } else if (ch === endChar) {
      depth -= 1;
    }

    if (depth === 0) {
      return JSON.parse(text.slice(jsonStart, i + 1)) as T;
    }
  }

  throw new Error('Failed to extract JSON payload');
}
