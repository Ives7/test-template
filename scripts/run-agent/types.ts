/**
 * Types for the Agent script running in the Vercel Sandbox
 * These types are used for communication with the backend activity-service
 */

/**
 * Context returned by the backend for Agent execution
 */
export interface AgentContext {
  /** Previous session ID for resuming conversations (null for first conversation) */
  sessionId: string | null;
  /** System prompts from category and style preset */
  systemPrompts: string[];
  /** Current user prompt to execute */
  currentPrompt: string;
  /** Historical messages (fallback when session resume fails) */
  messages: Array<{ role: string; content: string }>;
}

/**
 * Callback event types sent from Agent to backend
 */
export type AgentCallbackType = 'progress' | 'completed' | 'error';

/**
 * Role of the message sender
 */
export type AgentRole = 'user' | 'assistant' | 'system';

/**
 * Callback input payload sent to the backend
 */
export interface AgentCallbackInput {
  type: AgentCallbackType;
  role?: AgentRole;
  content?: string;
  metadata?: Record<string, unknown>;
  subtype?: string;
}

/**
 * SDK Message types from @anthropic-ai/claude-agent-sdk
 * These are simplified type definitions based on the SDK
 */
export interface SDKSystemMessage {
  type: 'system';
  subtype: 'init' | string;
  session_id: string;
}

export interface SDKAssistantMessage {
  type: 'assistant';
  message: {
    content: Array<{ type: string; text?: string }>;
  };
}

export interface SDKResultMessage {
  type: 'result';
  subtype: 'success' | 'error_max_turns' | 'error_during_execution' | string;
  result?: string;
  errors?: string[];
}

export interface SDKPartialAssistantMessage {
  type: 'partial_message';
  content: Array<{ type: string; text?: string }>;
}

export type SDKMessage =
  | SDKSystemMessage
  | SDKAssistantMessage
  | SDKResultMessage
  | SDKPartialAssistantMessage;
