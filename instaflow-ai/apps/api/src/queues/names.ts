/**
 * All background queues. Phase 1 implements `email` and the dead-letter queue;
 * the rest are reserved names for later phases so naming stays consistent.
 */
export const QUEUES = {
  email: 'email',
  deadLetter: 'dead-letter',
  // Phase 2+
  instagramWebhooks: 'instagram-webhooks',
  commentProcessing: 'comment-processing',
  privateReplies: 'private-replies',
  incomingDms: 'incoming-dms',
  aiResponses: 'ai-responses',
  analytics: 'analytics-aggregation',
  tokenHealth: 'token-health',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
