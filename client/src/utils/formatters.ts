/**
 * Format a number as US currency
 */
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Format a number with commas
 */
export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';

  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format a date string
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Format a percentage
 */
export function formatPercent(value: number | undefined | null, decimals: number = 1): string {
  if (value === undefined || value === null) return 'N/A';

  return `${value.toFixed(decimals)}%`;
}

/**
 * Format square footage
 */
export function formatSqFt(value: number | undefined | null): string {
  if (value === undefined || value === null) return 'N/A';

  return `${formatNumber(value)} sq ft`;
}

/**
 * Format lot size (can be in sq ft or acres)
 */
export function formatLotSize(sqFt: number | undefined | null): string {
  if (sqFt === undefined || sqFt === null) return 'N/A';

  if (sqFt >= 43560) {
    const acres = sqFt / 43560;
    return `${acres.toFixed(2)} acres`;
  }

  return `${formatNumber(sqFt)} sq ft`;
}

/**
 * Format interest rate
 */
export function formatInterestRate(rate: number | undefined | null): string {
  if (rate === undefined || rate === null) return 'N/A';

  return `${rate.toFixed(2)}%`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format phone number
 */
export function formatPhone(phone: string | undefined | null): string {
  if (!phone) return 'N/A';

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    return `1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return phone;
}

/**
 * Calculate and format time ago
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 }
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}
