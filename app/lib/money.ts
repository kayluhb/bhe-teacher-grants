export const money = (value: number): number => Math.round(Number(value) * 100) / 100;

export const formatUsd = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    currency: 'USD',
    style: 'currency',
  }).format(money(amount));
