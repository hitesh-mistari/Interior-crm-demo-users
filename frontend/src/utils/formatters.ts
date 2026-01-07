import { formatYMDHM } from './date';

export const formatCurrency = (amount: number): string => {
  if (amount === 0) return '0';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (value: number): string => {
  if (value === 0) return '0';

  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(value);
};

// Standardized date formatter: YYYY-MM-DD HH:MM
export const formatDate = (dateString: string): string => {
  return formatYMDHM(dateString);
};

export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');

  return `${displayHours}:${displayMinutes} ${ampm} IST`;
};

export const formatDateWithTime = (timestamp: string): string => {
  const date = formatDate(timestamp);
  const time = formatTimestamp(timestamp);
  return `${date} at ${time}`;
};

// Converts a numeric amount to words following the Indian numbering system.
// Example: 10170 -> "Ten Thousand One Hundred and Seventy Rupees Only"
export const amountToWords = (amount: number): string => {
  if (!Number.isFinite(amount)) return '';
  const n = Math.floor(Math.abs(amount));

  if (n === 0) return 'Zero Rupees Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const twoDigits = (num: number): string => {
    if (num === 0) return '';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    const t = Math.floor(num / 10);
    const o = num % 10;
    return `${tens[t]}${o ? ' ' + ones[o] : ''}`.trim();
  };

  const threeDigits = (num: number): string => {
    if (num === 0) return '';
    const h = Math.floor(num / 100);
    const r = num % 100;
    if (h && r) return `${ones[h]} Hundred and ${twoDigits(r)}`;
    if (h && !r) return `${ones[h]} Hundred`;
    return twoDigits(r);
  };

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${twoDigits(crore)} ${crore === 1 ? 'Crore' : 'Crores'}`);
  if (lakh) parts.push(`${twoDigits(lakh)} ${lakh === 1 ? 'Lakh' : 'Lakhs'}`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  return `${parts.join(' ')} Rupees Only`;
};
