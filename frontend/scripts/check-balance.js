function remainingAfterAdvance(finalQuotation, advanceAmount) {
  const f = Number(finalQuotation || 0);
  const a = Number(advanceAmount || 0);
  return Math.max(0, f - a);
}

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

const cases = [
  { final: 300000, advance: 120000, expected: 180000 },
  { final: 250000, advance: 0, expected: 250000 },
  { final: 0, advance: 50000, expected: 0 },
];

let pass = true;
for (const c of cases) {
  const got = remainingAfterAdvance(c.final, c.advance);
  const ok = got === c.expected;
  if (!ok) pass = false;
  console.log(
    `final=${fmt(c.final)} advance=${fmt(c.advance)} => remainingAfterAdvance=${fmt(got)} ${ok ? '✓' : `✗ expected ${fmt(c.expected)}`}`
  );
}

if (!pass) {
  console.error('Test failed');
  process.exit(1);
} else {
  console.log('All tests passed');
}
