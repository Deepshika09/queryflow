
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { RefreshCw, Inbox, AlertCircle, Loader2 } from 'lucide-react';
import { getInquiries, type Inquiry } from '@/api';

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-sky-100 text-sky-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
};

export default function AdminDashboard() {
  const auth = useAuth();
  const token = auth.user?.id_token ?? '';
  const [inquiries, setInquiries] = useState<Inquiry[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  async function load() {
    if (!token) {
      setStatus('error');
      setError('Please sign in before loading inquiries.');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const res = await getInquiries(token);
      setInquiries(res.inquiries);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(
        err instanceof Error ? err.message : 'Failed to load inquiries.',
      );
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          View the latest submitted inquiries.
        </p>

        <button
          onClick={() => void load()}
          disabled={status === 'loading'}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Load inquiries
        </button>
      </div>

      {status === 'error' && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {inquiries !== null && status === 'idle' && (
        <div>
          <p className="mb-3 text-sm text-slate-500">
            {inquiries.length} inquiry{inquiries.length !== 1 ? 's' : ''}
          </p>

          {inquiries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center">
              <Inbox className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                No inquiries yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {inquiries.map((q) => (
                <article
                  key={q.inquiryId}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {q.subject}
                      </h3>
                      <p className="text-xs text-slate-500">
                        from {q.name} · {q.email}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[q.status] ??
                        'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                    {q.message}
                  </p>

                  <p className="mt-3 text-xs text-slate-400">
                    {formatDate(q.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
