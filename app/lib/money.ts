export const money = (value: number): number => Math.round(Number(value) * 100) / 100;

export const finiteMoney = (value: number): number | null => {
  const amount = money(value);
  return Number.isFinite(amount) ? amount : null;
};

export const formatUsd = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    currency: 'USD',
    style: 'currency',
  }).format(money(amount));
