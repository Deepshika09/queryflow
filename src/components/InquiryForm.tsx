import { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { submitInquiry } from '@/api';
import { validateForm, type FieldErrors } from '@/validation';

const INITIAL = { name: '', email: '', subject: '', message: '' };

export default function InquiryForm() {
  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  function handleChange(field: keyof typeof INITIAL, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    if (touched[field]) setErrors(validateForm(next));
  }

  function handleBlur(field: keyof typeof INITIAL) {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validateForm(values));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateForm(values);
    setErrors(found);
    setTouched({ name: true, email: true, subject: true, message: true });
    if (Object.keys(found).length > 0) return;

    setStatus('submitting');
    setServerError('');
    try {
      await submitInquiry({
        name: values.name.trim(),
        email: values.email.trim(),
        subject: values.subject.trim(),
        message: values.message.trim(),
      });
      setStatus('success');
      setValues(INITIAL);
      setTouched({});
    } catch (err) {
      setStatus('error');
      setServerError(err instanceof Error ? err.message : 'Submission failed.');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h2 className="mt-4 text-xl font-semibold text-emerald-900">Inquiry submitted</h2>
        <p className="mt-2 text-sm text-emerald-700">
          Thank you. We've received your inquiry and will respond shortly.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-6 rounded-lg border border-emerald-300 bg-white px-5 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Field
        label="Full name"
        name="name"
        value={values.name}
        error={touched.name ? errors.name : undefined}
        onChange={(v) => handleChange('name', v)}
        onBlur={() => handleBlur('name')}
        placeholder="Jane Doe"
        maxLength={100}
      />
      <Field
        label="Email address"
        name="email"
        type="email"
        value={values.email}
        error={touched.email ? errors.email : undefined}
        onChange={(v) => handleChange('email', v)}
        onBlur={() => handleBlur('email')}
        placeholder="jane@example.com"
        maxLength={254}
      />
      <Field
        label="Subject"
        name="subject"
        value={values.subject}
        error={touched.subject ? errors.subject : undefined}
        onChange={(v) => handleChange('subject', v)}
        onBlur={() => handleBlur('subject')}
        placeholder="How can we help?"
        maxLength={200}
      />
      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-slate-700">
          Message
        </label>
        <textarea
          id="message"
          rows={5}
          value={values.message}
          maxLength={5000}
          placeholder="Describe your inquiry in detail…"
          onChange={(e) => handleChange('message', e.target.value)}
          onBlur={() => handleBlur('message')}
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 ${
            touched.message && errors.message
              ? 'border-rose-400 focus:ring-rose-200'
              : 'border-slate-300 focus:border-sky-500 focus:ring-sky-200'
          }`}
        />
        <div className="mt-1 flex justify-between">
          <span className="text-xs text-rose-600">{touched.message ? errors.message : ''}</span>
          <span className="text-xs text-slate-400">{values.message.length}/5000</span>
        </div>
      </div>

      {status === 'error' && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Submit inquiry
          </>
        )}
      </button>
    </form>
  );
}

interface FieldProps {
  label: string;
  name: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}

function Field({ label, name, value, error, onChange, onBlur, placeholder, type = 'text', maxLength }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 ${
          error
            ? 'border-rose-400 focus:ring-rose-200'
            : 'border-slate-300 focus:border-sky-500 focus:ring-sky-200'
        }`}
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
