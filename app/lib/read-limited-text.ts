/** Read a Response body, stopping once `max` bytes are decoded. */
export const readLimitedText = async (
  response: Response,
  max: number,
): Promise<string | null> => {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    const next = total + value.byteLength;
    if (next > max) {
      chunks.push(value.subarray(0, max - total));
      total = max;
      await reader.cancel();
      break;
    }
    chunks.push(value);
    total = next;
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
};
