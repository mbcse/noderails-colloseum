# @noderails/queue

Pluggable queue abstraction for NodeRails. Currently backed by BullMQ (Redis-based), but designed to be easily swapped for other queue implementations.

## Installation

```bash
pnpm add @noderails/queue
```

## Usage

### Configuration

Configure the queue connection once at application startup:

```typescript
import { configureQueue } from '@noderails/queue';

configureQueue({
  redisUrl: process.env.REDIS_URL,
  // Or individual options:
  // host: 'localhost',
  // port: 6379,
  // password: 'secret',
  prefix: 'noderails', // Key prefix in Redis
});
```

### Creating Queues

```typescript
import { createQueue } from '@noderails/queue';
import type { BlockchainTxJob } from '@noderails/queue';

const blockchainQueue = createQueue<BlockchainTxJob>('blockchain:tx');

// Add a job
await blockchainQueue.add('capture', {
  type: 'capture',
  chain: 'ethereum',
  intentId: 'pi_123',
  params: { /* ... */ },
});

// Add with options
await blockchainQueue.add('settle', jobData, {
  delay: 5000, // 5 second delay
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
});
```

### Creating Workers

```typescript
import { createWorker } from '@noderails/queue';
import type { BlockchainTxJob } from '@noderails/queue';

const worker = createWorker<BlockchainTxJob>(
  'blockchain:tx',
  async (job) => {
    console.log(`Processing ${job.name} for intent ${job.data.intentId}`);
    
    // Report progress
    await job.progress(50);
    
    // Do the work...
    const result = await processTransaction(job.data);
    
    await job.progress(100);
    return result;
  },
  { concurrency: 5 },
  {
    onCompleted: (job, result) => {
      console.log(`Job ${job.id} completed with result:`, result);
    },
    onFailed: (job, error) => {
      console.error(`Job ${job.id} failed:`, error);
    },
  }
);

await worker.run();
```

### Using the Registry

For managing multiple queues and workers:

```typescript
import { queueRegistry } from '@noderails/queue';

// Register workers at startup
queueRegistry.registerWorker('blockchain:tx', processTx, { concurrency: 5 });
queueRegistry.registerWorker('webhook:delivery', deliverWebhook, { concurrency: 10 });

// Start all workers
await queueRegistry.startAll();

// On shutdown
await queueRegistry.closeAll();
```

## Switching Queue Backends

The queue package is designed to be pluggable. To switch from BullMQ to another backend:

1. **Create a new adapter** implementing `IQueueAdapter` and `IWorkerAdapter`:

```typescript
// src/adapters/sqs.ts
import type { IQueueAdapter, IWorkerAdapter } from '../interfaces.js';

export class SQSAdapter<T> implements IQueueAdapter<T> {
  // Implement all methods...
}

export class SQSWorkerAdapter<T> implements IWorkerAdapter<T> {
  // Implement all methods...
}
```

2. **Update the factory** to use the new adapter:

```typescript
// src/factory.ts
import { SQSAdapter, SQSWorkerAdapter } from './adapters/sqs.js';

export function createQueue<T>(name: string, options?: ConnectionOptions): IQueue<T> {
  return new SQSAdapter<T>(name, { ...globalOptions, ...options });
}
```

3. **No changes needed in services** - they use the abstract interface!

## Job Types

Pre-defined job types for NodeRails:

- `BlockchainTxJob` - Submit blockchain transactions
- `BlockchainConfirmJob` - Monitor transaction confirmations
- `WebhookDeliveryJob` - Deliver webhooks to merchants
- `SubscriptionChargeJob` - Process recurring subscription charges
- `PayoutExecuteJob` - Execute merchant payouts

## API Reference

### IQueue Interface

```typescript
interface IQueue<T> {
  name: string;
  add(name: string, data: T, options?: JobOptions): Promise<JobResult<T>>;
  addBulk(jobs: Array<{ name: string; data: T; options?: JobOptions }>): Promise<JobResult<T>[]>;
  getJob(jobId: string): Promise<JobResult<T> | null>;
  getJobs(status: JobStatus | JobStatus[], start?: number, end?: number): Promise<JobResult<T>[]>;
  getJobCounts(): Promise<Record<JobStatus, number>>;
  removeJob(jobId: string): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  close(): Promise<void>;
  drain(): Promise<void>;
  obliterate(): Promise<void>;
}
```

### IWorker Interface

```typescript
interface IWorker<T> {
  name: string;
  isRunning: boolean;
  run(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  close(): Promise<void>;
}
```
