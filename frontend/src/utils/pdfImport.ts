import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf';

// Configure worker from CDN to avoid bundler worker setup complexity
GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export interface ParsedProduct {
  name: string;
  unit: string;
  defaultRate?: number;
  description?: string;
  category?: string;
  sku?: string;
  tags?: string[];
}

function normalizeAmount(s: string): number | undefined {
  const clean = s.replace(/[^0-9.]/g, '');
  if (!clean) return undefined;
  const n = Number(clean);
  return Number.isFinite(n) ? n : undefined;
}

function lineToProduct(line: string): ParsedProduct | null {
  const raw = line.replace(/\s+/g, ' ').trim();
  if (!raw) return null;

  // Try strict regex first: [idx] name qty unit rate amount
  const strict = raw.match(
    /^\s*(?:\d+\s*[-.)]\s*)?(.*?)\s+(\d+(?:\.\d+)?)\s+([A-Za-z./\-() ]+?)\s+₹?\s*([\d,]+(?:\.\d+)?)\s+₹?\s*([\d,]+(?:\.\d+)?)\s*$/
  );
  if (strict) {
    const name = strict[1].trim();
    const qtyStr = strict[2];
    const unit = strict[3].trim();
    const rateStr = strict[4];
    // const amountStr = strict[5]; // not used for product catalog
    const rate = normalizeAmount(rateStr);
    return { name, unit, defaultRate: rate };
  }

  // Fallback token-based parsing: use last 3 numbers as qty, rate, amount
  const cleaned = raw.replace(/₹/g, '').replace(/,/g, '');
  const tokens = cleaned.split(' ');
  const numberIdx: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (/^\d+(?:\.\d+)?$/.test(tokens[i])) numberIdx.push(i);
  }
  if (numberIdx.length >= 3) {
    const qtyIdx = numberIdx[numberIdx.length - 3];
    const rateIdx = numberIdx[numberIdx.length - 2];
    // const amountIdx = numberIdx[numberIdx.length - 1];
    const name = tokens.slice(0, qtyIdx).join(' ').trim();
    const unit = tokens.slice(qtyIdx + 1, rateIdx).join(' ').trim() || 'pcs';
    const rate = normalizeAmount(tokens[rateIdx]);
    if (name) return { name, unit, defaultRate: rate };
  }

  return null;
}

export async function extractProductsFromPdf(url: string): Promise<ParsedProduct[]> {
  try {
    const task = getDocument({ url });
    const pdf = await task.promise;
    const lines: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Group by Y coordinate to approximate line reconstruction
      const lineMap: Record<number, string[]> = {};
      for (const item of content.items as any[]) {
        const str: string = item.str || '';
        const y = Math.round(item.transform?.[5] || 0);
        if (!lineMap[y]) lineMap[y] = [];
        lineMap[y].push(str);
      }
      const pageLines = Object.entries(lineMap)
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .map(([, parts]) => parts.join(' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      lines.push(...pageLines);
    }

    // Find header row and scan following item lines until totals section
    const headerIdx = lines.findIndex((l) => {
      const s = l.toLowerCase();
      return s.includes('item') && s.includes('qty') && (s.includes('unit') || s.includes('units')) && s.includes('rate');
    });

    const scanStart = headerIdx >= 0 ? headerIdx + 1 : 0;
    const parsed: ParsedProduct[] = [];
    for (let i = scanStart; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();
      if (/(subtotal|tax|gst|total|terms|notes)/.test(lower)) break;
      const p = lineToProduct(line);
      if (p && p.name.length >= 2) parsed.push(p);
    }

    // Deduplicate by name+unit, keep first rate encountered
    const seen = new Set<string>();
    const unique: ParsedProduct[] = [];
    for (const p of parsed) {
      const key = `${p.name.toLowerCase()}__${p.unit.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(p);
    }
    return unique;
  } catch (err) {
    console.warn('PDF import error', err);
    return [];
  }
}

