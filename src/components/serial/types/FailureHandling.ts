// FailureHandling.ts - New failure handling type definitions
export interface CommandFailureConfig {
  // Only support these for individual commands/URC
  maxAttempts?: number; // Number of retries (default 1)
  failureSeverity?: 'warning' | 'error'; // Severity level
  failurePrompt?: string; // Custom failure prompt message
}

export interface CaseFailureHandling {
  // Test case level failure handling (determines stop/continue behavior)
  strategy: 'stop' | 'continue' | 'prompt';
  onWarning?: 'continue' | 'stop' | 'prompt'; // How to handle warning-level failures
  onError?: 'continue' | 'stop' | 'prompt'; // How to handle error-level failures
}

// Legacy support for migration
export interface LegacyFailureHandling {
  failureHandling?: 'stop' | 'continue' | 'prompt' | 'retry';
  urcFailureHandling?: 'stop' | 'continue' | 'prompt';
}