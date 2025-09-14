// Email utility functions

// Most browsers/email clients have mailto: URL length limits
// Chrome/Firefox: ~2083 chars, Safari: ~100k chars, IE: ~2083 chars
const MAILTO_LENGTH_WARNING = 1800;
const MAILTO_LENGTH_CRITICAL = 2000;

export interface EmailLengthCheck {
  totalLength: number;
  isWarning: boolean;
  isCritical: boolean;
  message: string;
}

export const checkEmailLength = (subject: string, body: string): EmailLengthCheck => {
  // Calculate mailto: URL length
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  const totalLength = `mailto:?subject=${encodedSubject}&body=${encodedBody}`.length;
  
  let message = "";
  let isWarning = false;
  let isCritical = false;
  
  if (totalLength > MAILTO_LENGTH_CRITICAL) {
    isCritical = true;
    message = `Email is too long (${totalLength} chars). Some email clients may not open it. Consider shortening the message or using copy-to-clipboard instead.`;
  } else if (totalLength > MAILTO_LENGTH_WARNING) {
    isWarning = true;
    message = `Email is getting long (${totalLength} chars). Keep it under 2000 characters for best compatibility.`;
  }
  
  return {
    totalLength,
    isWarning,
    isCritical,
    message
  };
};

export const formatCharCount = (current: number, max: number): string => {
  const percentage = Math.round((current / max) * 100);
  return `${current} / ${max} (${percentage}%)`;
};