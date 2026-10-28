
export const API_BASE_URL =
  (import.meta as ImportMeta & { env: Record<string, string> }).env
    .VITE_API_BASE_URL ??
  'https://giawpn8ez7.execute-api.ap-southeast-2.amazonaws.com/prod';

export interface Inquiry {
  inquiryId: string;
  userSub?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: number;
}

interface ApiError {
  success: false;
  error: string;
}

interface SubmitSuccess {
  success: true;
  message: string;
  inquiryId: string;
}

interface ListSuccess {
  success: true;
  count: number;
  inquiries: Inquiry[];
}

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  if (!token) {
    throw new Error('Please sign in before continuing.');
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      'Cannot connect to QueryFlow. Check your internet connection and API URL.',
    );
  }

  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.success) {
    const error = body as ApiError | null;

    if (response.status === 401) {
      throw new Error('Your session may have expired. Please sign in again.');
    }

    if (response.status === 403) {
      throw new Error('You do not have permission to perform this action.');
    }

    throw new Error(
      error?.error ?? `Request failed (HTTP ${response.status}).`,
    );
  }

  return body as T;
}

export function submitInquiry(
  payload: {
    name: string;
    subject: string;
    message: string;
  },
  token: string,
): Promise<SubmitSuccess> {
  return request<SubmitSuccess>('/inquiries', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getMyInquiries(token: string): Promise<ListSuccess> {
  return request<ListSuccess>('/my/inquiries', token);
}

export function getInquiries(token: string): Promise<ListSuccess> {
  return request<ListSuccess>('/admin/inquiries', token);
}
