export function formatPrice(value: number, digits: number): string {
  if (!Number.isFinite(value)) {
    return '--';
  }
  return value.toFixed(digits);
}

export function formatMoney(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) {
    return `-- ${currency}`;
  }
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

export function formatUnixTime(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

