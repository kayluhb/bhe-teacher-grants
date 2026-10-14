import {describe, expect, it} from 'vitest';
import {readLimitedText} from '~/lib/read-limited-text';

const streamedResponse = (parts: string[]) => {
  const encoder = new TextEncoder();
  let index = 0;
  return new Response(
    new ReadableStream({
      pull(controller) {
        if (index >= parts.length) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(parts[index]));
        index += 1;
      },
    }),
  );
};

describe('readLimitedText', () => {
  it('returns the full body when it fits under the cap', async () => {
    const response = streamedResponse(['hello ', 'world']);
    await expect(readLimitedText(response, 100)).resolves.toBe('hello world');
  });

  it('stops reading once the byte cap is reached', async () => {
    const response = streamedResponse(['abc', 'defghijklmnopqrstuvwxyz']);
    await expect(readLimitedText(response, 5)).resolves.toBe('abcde');
  });

  it('returns null when the response has no body', async () => {
    await expect(readLimitedText(new Response(null), 10)).resolves.toBeNull();
  });
});
