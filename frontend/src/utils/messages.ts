// Messaging utilities for payment confirmations
// Detects preferred channel based on contact string and builds WhatsApp/SMS URLs.

export type Channel = 'whatsapp' | 'sms' | 'none';

const digitsOnly = (s?: string): string => (s || '').replace(/\D+/g, '');

export const detectPreferredChannel = (contact?: string): Channel => {
  const digits = digitsOnly(contact);
  if (digits.length >= 10) return 'whatsapp';
  // If no valid phone number, fall back to SMS attempt (may still fail)
  if (digits.length > 0) return 'sms';
  return 'none';
};

export const composePaymentConfirmation = (
  clientName: string,
  amountReceivedLabel: string,
  amountLeftLabel: string,
  link?: string
): string => {
  const lines = [
    `Hello ${clientName},`,
    `Thank you for your payment of ${amountReceivedLabel}.`,
    `Your remaining balance is ${amountLeftLabel}.`,
    'We appreciate your business!',
  ];
  // if (link) lines.push(`View details: ${link}`);
  return lines.join('\n');
};

export const buildWhatsAppUrl = (phone: string, message: string): string => {
  const digits = digitsOnly(phone);
  // Assume India numbers default to 10 digits without country code; prefix 91
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
};

export const buildSmsUrl = (phone: string, message: string): string => {
  const digits = digitsOnly(phone);
  // sms: scheme support varies by platform; include body param
  return `sms:${digits}?&body=${encodeURIComponent(message)}`;
};

export const tryOpen = (url: string): boolean => {
  try {
    const w = window.open(url, '_blank');
    return !!w;
  } catch {
    return false;
  }
};

