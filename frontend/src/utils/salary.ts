export function computeGrossPay(options: {
  baseSalary?: number;
  rateType?: 'Hourly' | 'Daily';
  rateAmount?: number;
  hoursWorked?: number;
  daysWorked?: number;
  labourBreakdown?: { amount: number }[];
  benefits?: { amount: number }[];
  bonuses?: { amount: number }[];
}): { gross: number; benefitsTotal: number; bonusesTotal: number } {
  const { baseSalary = 0, rateType, rateAmount = 0, hoursWorked = 0, daysWorked = 0 } = options;
  const lb = (options.labourBreakdown || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const benefitsTotal = (options.benefits || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const bonusesTotal = (options.bonuses || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  let variable = 0;
  if (rateType === 'Hourly') variable = rateAmount * hoursWorked;
  if (rateType === 'Daily') variable = rateAmount * daysWorked;
  const gross = Math.max(0, baseSalary + variable + lb + benefitsTotal + bonusesTotal);
  return { gross, benefitsTotal, bonusesTotal };
}

export function computeNetPay(options: {
  gross: number;
  taxPercent?: number;
}): { tax: number; net: number } {
  const tax = Math.max(0, Math.round(((options.taxPercent || 0) / 100) * options.gross));
  const net = Math.max(0, options.gross - tax);
  return { tax, net };
}
