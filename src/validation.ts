export interface FieldErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateForm(values: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.name.trim()) {
    errors.name = 'Name is required.';
  } else if (values.name.trim().length > 100) {
    errors.name = 'Name must be 100 characters or fewer.';
  }

  if (!values.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_RE.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!values.subject.trim()) {
    errors.subject = 'Subject is required.';
  } else if (values.subject.trim().length > 200) {
    errors.subject = 'Subject must be 200 characters or fewer.';
  }

  if (!values.message.trim()) {
    errors.message = 'Message is required.';
  } else if (values.message.trim().length > 5000) {
    errors.message = 'Message must be 5000 characters or fewer.';
  }

  return errors;
}
