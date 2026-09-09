import { OneKeyLocalError } from '@onekeyhq/shared/src/errors';

import { CloudChatSerialQueue } from './CloudChatSerialQueue';

describe('CloudChatSerialQueue', () => {
  it('serializes tasks and keeps running after failure', async () => {
    const queue = new CloudChatSerialQueue();
    const events: string[] = [];
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = queue.run(async () => {
      events.push('first');
      await gate;
      events.push('finished');
    });
    const failed = queue.run(async () => {
      throw new OneKeyLocalError('expected');
    });
    const failure = failed.catch((error: Error) => error.message);
    const second = queue.run(async () => {
      events.push('second');
    });
    await Promise.resolve();
    expect(events).toEqual(['first']);
    release();
    await Promise.all([first, failure, second]);
    await expect(failure).resolves.toBe('expected');
    expect(events).toEqual(['first', 'finished', 'second']);
  });
});
