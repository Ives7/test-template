import type { BackendClient } from './backend-client';

/**
 * Session manager for persisting Claude Agent SDK session IDs
 * Saves session ID to the backend for multi-turn conversation support
 */
export class SessionManager {
  constructor(private client: BackendClient) {}

  /**
   * Save the session ID to the backend
   * Called when receiving SDKSystemMessage with subtype 'init'
   * The backend will store this ID in the Activity entity for later resume
   */
  async saveSession(sessionId: string): Promise<void> {
    await this.client.reportProgress({
      type: 'progress',
      subtype: 'session_init',
      metadata: { sessionId },
    });
  }
}
