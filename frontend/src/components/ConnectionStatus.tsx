import { useEffect, useState } from 'react';
import { useEffect, useState } from 'react';

export default function ConnectionStatus() {
  const [status, setStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`);
        const data = await res.json().catch(() => ({ ok: false }));
        if (res.ok && data.ok) {
          setStatus('connected');
          setMessage('Backend healthy');
        } else {
          setStatus('error');
          setMessage('Backend health check failed');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Backend unreachable');
      }
    };
    check();
  }, []);

  const color = status === 'connected' ? 'bg-green-100 border-green-300 text-green-700'
    : status === 'error' ? 'bg-red-100 border-red-300 text-red-700'
      : 'bg-slate-100 border-slate-300 text-slate-700';

  return (
    <div
      className={`fixed bottom-3 right-3 z-40 border rounded-full px-2 py-1 text-xs inline-flex items-center gap-1 shadow-sm ${color}`}
      role="status"
      aria-live="polite"
    >
      <span className="font-semibold">Database:</span>
      <span>{message || 'Checking connection...'}</span>
    </div>
  );
}
