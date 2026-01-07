

// Store key in memory only - more secure than localStorage
let memoryKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (memoryKey) return memoryKey;

  // Generate a new key for this session
  const material = crypto.getRandomValues(new Uint8Array(32));
  memoryKey = await crypto.subtle.importKey('raw', material, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);

  return memoryKey;
}

export async function encryptJson(obj: any): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  const out = new Uint8Array(iv.byteLength + enc.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(enc), iv.byteLength);
  return btoa(String.fromCharCode(...out));
}

export async function decryptJson(payload: string): Promise<any> {
  const key = await getKey();
  const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  const iv = bytes.slice(0, 12);
  const data = bytes.slice(12);
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  const text = new TextDecoder().decode(dec);
  return JSON.parse(text);
}
