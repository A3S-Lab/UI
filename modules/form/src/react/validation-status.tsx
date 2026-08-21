import { type FormLocaleMessages, formatFormMessage } from '../core';

export function ValidationStatus({
  label,
  messages,
}: {
  label: string;
  messages: Readonly<FormLocaleMessages>;
}) {
  return (
    <span
      className="a3s-form-validation-status"
      role="status"
      aria-label={formatFormMessage(messages, 'validationPendingLabel', { label })}
    >
      {messages.validationPending}
    </span>
  );
}
