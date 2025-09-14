// Email validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateEmailAdvanced = (email: string): { valid: boolean; reason?: string } => {
  if (!email) {
    return { valid: false, reason: "Email is required" };
  }
  
  const trimmed = email.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, reason: "Email is too short" };
  }
  
  if (trimmed.length > 254) {
    return { valid: false, reason: "Email is too long (max 254 characters)" };
  }
  
  if (!validateEmail(trimmed)) {
    return { valid: false, reason: "Invalid email format" };
  }
  
  // Check for common typos
  const commonTypos = [
    { pattern: /gmial\.com$/i, suggestion: "gmail.com" },
    { pattern: /gmai\.com$/i, suggestion: "gmail.com" },
    { pattern: /yahooo\.com$/i, suggestion: "yahoo.com" },
    { pattern: /hotmial\.com$/i, suggestion: "hotmail.com" },
    { pattern: /outlok\.com$/i, suggestion: "outlook.com" },
  ];
  
  for (const typo of commonTypos) {
    if (typo.pattern.test(trimmed)) {
      return { 
        valid: false, 
        reason: `Did you mean ${trimmed.replace(typo.pattern, typo.suggestion)}?` 
      };
    }
  }
  
  return { valid: true };
};

export const findDuplicateEmails = (recipients: Array<{ email: string }>): string[] => {
  const emailCounts = new Map<string, number>();
  const duplicates: string[] = [];
  
  recipients.forEach(recipient => {
    const email = recipient.email.trim().toLowerCase();
    if (email) {
      const count = emailCounts.get(email) || 0;
      emailCounts.set(email, count + 1);
      if (count === 1) {
        duplicates.push(email);
      }
    }
  });
  
  return duplicates;
};

export const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};