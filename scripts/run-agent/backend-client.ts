import type { AgentCallbackInput, AgentContext } from './types';

/**
 * Backend callback client for Agent-to-Backend communication
 * Responsible for fetching context and reporting progress/completion/errors
 */
export class BackendClient {
  constructor(
    private baseUrl: string,
    private activityId: string,
  ) {}

  /**
   * Fetch Agent execution context from the backend
   * Includes session ID for resume, system prompts, and current prompt
   */
  async fetchAgentContext(): Promise<AgentContext> {
    const response = await fetch(
      `${this.baseUrl}/activities/${this.activityId}/agent-context`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch agent context: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Report progress to the backend (will be forwarded via SSE to frontend)
   */
  async reportProgress(event: AgentCallbackInput): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/agent/callback/${this.activityId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      },
    );

    if (!response.ok) {
      console.error(
        `Failed to report progress: ${response.status} ${response.statusText}`,
      );
    }
  }

  /**
   * Report task completion to the backend
   */
  async reportCompleted(result: string): Promise<void> {
    await this.reportProgress({
      type: 'completed',
      role: 'assistant',
      content: result,
    });
  }

  /**
   * Report error to the backend
   */
  async reportError(error: Error): Promise<void> {
    await this.reportProgress({
      type: 'error',
      content: error.message,
      metadata: {
        stack: error.stack,
        name: error.name,
      },
    });
  }
}
