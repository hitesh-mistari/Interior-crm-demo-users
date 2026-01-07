// Lightweight client-side helpers for handling sensitive fields
// Note: For true PCI DSS compliance, card data must be tokenized using a certified PSP.

export const maskSensitive = (value?: string): string | undefined => {
  if (!value) return undefined;
  const v = value.trim();
  if (v.length <= 4) return v;
  return `${'*'.repeat(Math.max(v.length - 4, 4))}${v.slice(-4)}`;
};

