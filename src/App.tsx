
import { useState, type FormEvent } from 'react';
import { useAuth } from 'react-oidc-context';
import {
  getInquiries,
  getMyInquiries,
  submitInquiry,
  type Inquiry,
} from './api';

type Page = 'submit' | 'mine' | 'admin';

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function InquiryList({
  inquiries,
  emptyMessage,
}: {
  inquiries: Inquiry[];
  emptyMessage: string;
}) {
  if (inquiries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {inquiries.map((inquiry) => (
        <article
          key={inquiry.inquiryId}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">
                {inquiry.subject}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {inquiry.name} · {inquiry.email || 'No email available'}
              </p>
            </div>

            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              {inquiry.status}
            </span>
          </div>

          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {inquiry.message}
          </p>

          <p className="mt-4 text-xs text-slate-400">
            Submitted {formatDate(inquiry.createdAt)}
          </p>
        </article>
      ))}
    </div>
  );
}

export default function App() {
  const auth = useAuth();

  const token = auth.user?.id_token ?? '';
  const groups = auth.user?.profile['cognito:groups'];
  const isAdmin = Array.isArray(groups) && groups.includes('admins');
  const email = String(auth.user?.profile.email ?? 'Signed-in user');

  const [page, setPage] = useState<Page>('submit');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [myInquiries, setMyInquiries] = useState<Inquiry[]>([]);
  const [adminInquiries, setAdminInquiries] = useState<Inquiry[]>([]);
  const [myLoaded, setMyLoaded] = useState(false);
  const [adminLoaded, setAdminLoaded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadMine() {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const result = await getMyInquiries(token);
      setMyInquiries(result.inquiries);
      setMyLoaded(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load your inquiries.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAdmin() {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const result = await getInquiries(token);
      setAdminInquiries(result.inquiries);
      setAdminLoaded(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load inquiries.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const result = await submitInquiry(
        {
          name: name.trim(),
          subject: subject.trim(),
          message: message.trim(),
        },
        token,
      );

      setNotice(`${result.message} Reference: ${result.inquiryId}`);
      setName('');
      setSubject('');
      setMessage('');
      setPage('mine');

      const personalResult = await getMyInquiries(token);
      setMyInquiries(personalResult.inquiries);
      setMyLoaded(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not submit inquiry.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      // Clear the locally stored signed-in user.
      await auth.removeUser();

      // Redirect to Cognito's logout endpoint.
      const logoutUrl = new URL(
        'https://ap-southeast-2jyn8txomg.auth.ap-southeast-2.amazoncognito.com/logout',
      );

      logoutUrl.searchParams.set(
        'client_id',
        '612puge515r68q57a0hkmqduvp',
      );
      logoutUrl.searchParams.set(
        'logout_uri',
        'https://d2o670fn9dzsau.cloudfront.net/',
      );

      window.location.assign(logoutUrl.toString());
    } catch (err) {
      console.error('Sign-out failed:', err);
      setError('Sign out failed. Please try again.');
    }
  }

  if (auth.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-600">
        Loading QueryFlow…
      </main>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-sky-700">
            QUERYFLOW
          </p>

          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            Your inquiries, organised.
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Sign in to submit an inquiry and track its status.
          </p>

          {auth.error && (
            <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              Sign-in error: {auth.error.message}
            </p>
          )}

          <button
            onClick={() => void auth.signinRedirect()}
            className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800"
          >
            Sign in
          </button>
        </section>
      </main>
    );
  }

  const navButton = (value: Page, label: string) => (
    <button
      key={value}
      onClick={() => {
        setPage(value);
        setError('');
        setNotice('');

        if (value === 'mine' && !loading) {
          void loadMine();
        }

        if (value === 'admin' && isAdmin && !loading) {
          void loadAdmin();
        }
      }}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${
        page === value
          ? 'bg-slate-900 text-white'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-sky-700">
              QUERYFLOW
            </p>
            <p className="text-sm text-slate-500">
              Inquiry management
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-sm text-slate-600 sm:inline">
              {email}
            </span>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome to QueryFlow
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Submit an inquiry and track it from one place.
          </p>
        </div>

        <nav className="mb-6 flex flex-wrap gap-2">
          {navButton('submit', 'Submit inquiry')}
          {navButton('mine', 'My inquiries')}
          {isAdmin && navButton('admin', 'Admin dashboard')}
        </nav>

        {error && (
          <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {notice}
          </div>
        )}

        {page === 'submit' && (
          <section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Submit a new inquiry
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your inquiry will be associated with your signed-in account.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Your name
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Subject
                </label>
                <input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={150}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={5000}
                  required
                  rows={5}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? 'Please wait…' : 'Submit inquiry'}
              </button>
            </form>
          </section>
        )}

        {page === 'mine' && (
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  My inquiries
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Only inquiries submitted by your account are shown here.
                </p>
              </div>

              <button
                onClick={() => void loadMine()}
                disabled={loading}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
              >
                {loading ? 'Loading…' : 'Refresh'}
              </button>
            </div>

            {myLoaded && (
              <p className="mb-4 text-sm text-slate-500">
                {myInquiries.length}{' '}
                {myInquiries.length === 1 ? 'inquiry' : 'inquiries'}
              </p>
            )}

            {myLoaded ? (
              <InquiryList
                inquiries={myInquiries}
                emptyMessage="You haven't submitted any inquiries yet."
              />
            ) : (
              <p className="text-sm text-slate-500">
                Select Refresh to load your inquiries.
              </p>
            )}
          </section>
        )}

        {page === 'admin' && isAdmin && (
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Admin dashboard
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  All inquiries from all users. This view is restricted to admins.
                </p>
              </div>

              <button
                onClick={() => void loadAdmin()}
                disabled={loading}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
              >
                {loading ? 'Loading…' : 'Refresh all inquiries'}
              </button>
            </div>

            {adminLoaded ? (
              <InquiryList
                inquiries={adminInquiries}
                emptyMessage="No inquiries have been submitted yet."
              />
            ) : (
              <p className="text-sm text-slate-500">
                Select Refresh all inquiries to load the admin list.
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
