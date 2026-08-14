export function formatAmount(amount: number, currency: string): string {
  return `${currency} ${Math.abs(Math.round(amount)).toLocaleString()}`;
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function humanizeField(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}
