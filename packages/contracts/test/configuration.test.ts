import { ConfigureWorkspaceRequest } from '../src/index.js';
import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';

const valid = {
  providerCode: 'msc',
  displayName: 'MSC dummy connector',
  referenceTypes: ['container'],
  credential: 'placeholder',
  cadence: '*/15 * * * *',
  timezone: 'UTC',
  requestsPerMinute: 20,
  concurrentCrawls: 3,
  destinationType: 'download',
  destinationFormat: 'json',
};

describe('workspace configuration contract', () => {
  it.each([
    ['unsupported schedule', { cadence: '* * * * *' }],
    ['zero rate limit', { requestsPerMinute: 0 }],
    ['excess concurrency', { concurrentCrawls: 11 }],
    ['missing reference type', { referenceTypes: [] }],
  ])('rejects %s', (_name, override) => {
    expect(() =>
      Schema.decodeUnknownSync(ConfigureWorkspaceRequest)({ ...valid, ...override }),
    ).toThrow();
  });
});
