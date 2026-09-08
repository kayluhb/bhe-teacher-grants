export const grantFileKeys = (
  grant: {proof_of_delivery_r2_key: string | null; receipt_r2_key: string | null},
  items: {quote_r2_key: string | null}[],
): string[] => {
  const keys = [grant.receipt_r2_key, grant.proof_of_delivery_r2_key];
  for (const item of items) keys.push(item.quote_r2_key);
  return keys.filter((key): key is string => Boolean(key));
};

export const deleteGrantFiles = async (
  bucket: {delete: (key: string) => Promise<unknown>},
  keys: string[],
): Promise<void> => {
  await Promise.all(keys.map((key) => bucket.delete(key).catch(() => undefined)));
};
