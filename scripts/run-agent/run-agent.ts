import { query } from '@anthropic-ai/claude-agent-sdk';

import { BackendClient } from './lib/backend-client';
import { SessionManager } from './lib/session-manager';
import type { AgentContext, SDKMessage } from './lib/types';

// Environment variables injected by SandboxService.startAgent
const BACKEND_URL = process.env.BACKEND_URL;
const ACTIVITY_ID = process.env.ACTIVITY_ID;

// Validate required environment variables
if (!BACKEND_URL) {
  console.error('Error: BACKEND_URL environment variable is required');
  process.exit(1);
}

if (!ACTIVITY_ID) {
  console.error('Error: ACTIVITY_ID environment variable is required');
  process.exit(1);
}

const client = new BackendClient(BACKEND_URL, ACTIVITY_ID);
const sessionManager = new SessionManager(client);

/**
 * Build full prompt for first conversation (includes system prompts)
 */
function buildFullPrompt(
  systemPrompts: string[],
  userPrompt: string,
): string {
  const systemPart = systemPrompts.filter(Boolean).join('\n\n');

  if (!systemPart) {
    return userPrompt;
  }

  return `${systemPart}

---

User Request:
${userPrompt}`;
}

/**
 * Build fallback prompt from message history (when session resume fails)
 */
function buildFallbackPrompt(
  systemPrompts: string[],
  messages: Array<{ role: string; content: string }>,
  currentPrompt: string,
): string {
  const systemPart = systemPrompts.filter(Boolean).join('\n\n');

  // Format historical messages
  const historyPart = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const parts = [systemPart, historyPart, `User: ${currentPrompt}`].filter(
    Boolean,
  );

  return parts.join('\n\n---\n\n');
}

/**
 * Extract text content from SDK assistant message
 */
function extractTextContent(message: SDKMessage): string {
  if (message.type === 'assistant' && message.message?.content) {
    return message.message.content
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('\n');
  }
  return '';
}

/**
 * Handle SDK messages and report to backend
 */
async function handleMessage(message: SDKMessage): Promise<void> {
  switch (message.type) {
    case 'system':
      if (message.subtype === 'init') {
        // Save session_id for future resume
        await sessionManager.saveSession(message.session_id);
      }
      break;

    case 'assistant':
      // Report AI response to backend
      const content = extractTextContent(message);
      if (content) {
        await client.reportProgress({
          type: 'progress',
          role: 'assistant',
          content,
        });
      }
      break;

    case 'result':
      if (message.subtype === 'success') {
        await client.reportCompleted(message.result || 'Task completed');
      } else {
        const errorMessage = message.errors?.join(', ') || 'Unknown error';
        await client.reportError(new Error(errorMessage));
      }
      break;

    case 'partial_message':
      // Optional: streaming output support
      const partialContent = message.content
        ?.filter((block) => block.type === 'text' && block.text)
        .map((block) => block.text)
        .join('');
      if (partialContent) {
        await client.reportProgress({
          type: 'progress',
          role: 'assistant',
          content: partialContent,
          subtype: 'partial',
        });
      }
      break;
  }
}

/**
 * Run Agent with session resume
 */
async function runWithResume(
  sessionId: string,
  currentPrompt: string,
): Promise<void> {
  const options = {
    allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
    permissionMode: 'bypassPermissions' as const,
    allowDangerouslySkipPermissions: true,
    cwd: process.cwd(),
    resume: sessionId,
  };

  for await (const message of query({
    prompt: currentPrompt,
    options,
  })) {
    await handleMessage(message as SDKMessage);
  }
}

/**
 * Run Agent with full prompt (first conversation or fallback)
 */
async function runWithFullPrompt(prompt: string): Promise<void> {
  const options = {
    allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
    permissionMode: 'bypassPermissions' as const,
    allowDangerouslySkipPermissions: true,
    cwd: process.cwd(),
  };

  for await (const message of query({
    prompt,
    options,
  })) {
    await handleMessage(message as SDKMessage);
  }
}

/**
 * Main entry point
 */
export async function main(): Promise<void> {
  try {
    // 1. Fetch context from backend API (includes prompt, session_id, etc.)
    const context: AgentContext = await client.fetchAgentContext();

    // 2. Validate current prompt
    if (!context.currentPrompt) {
      throw new Error('No prompt available in agent context');
    }

    // 3. Try to resume if session exists, otherwise start fresh
    if (context.sessionId) {
      try {
        // Attempt to resume previous session
        console.log(`Attempting to resume session: ${context.sessionId}`);
        await runWithResume(context.sessionId, context.currentPrompt);
        return;
      } catch (error) {
        // Resume failed, fallback to full prompt with history
        console.warn(
          'Session resume failed, falling back to full prompt:',
          (error as Error).message,
        );
      }
    }

    // 4. First conversation or resume fallback: use full prompt
    let prompt: string;

    if (context.messages && context.messages.length > 0) {
      // Fallback: build prompt with message history
      prompt = buildFallbackPrompt(
        context.systemPrompts,
        context.messages,
        context.currentPrompt,
      );
    } else {
      // First conversation: build prompt with system prompts only
      prompt = buildFullPrompt(context.systemPrompts, context.currentPrompt);
    }

    await runWithFullPrompt(prompt);
  } catch (error) {
    // Report error to backend and exit
    await client.reportError(error as Error);
    process.exit(1);
  }
}

