import { deliverMail, type MailMessage } from '../modules/mail/mailer.js';
import { QUEUES, type QueueName } from './names.js';

export interface JobPayloads {
  [QUEUES.email]: MailMessage;
}

export type ImplementedQueue = keyof JobPayloads;

type Processor<Q extends ImplementedQueue> = (data: JobPayloads[Q]) => Promise<void>;

/**
 * Processors must be idempotent: BullMQ may retry a job after a crash.
 * (Email is "at least once"; later-phase processors that send Instagram
 * messages guard side-effects with AutomationExecution.idempotencyKey.)
 */
export const processors: { [Q in ImplementedQueue]: Processor<Q> } = {
  [QUEUES.email]: async (msg) => deliverMail(msg),
};

export function isImplemented(name: QueueName): name is ImplementedQueue {
  return name in processors;
}
