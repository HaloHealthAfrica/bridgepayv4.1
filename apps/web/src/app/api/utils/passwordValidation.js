/**
 * Password Validation Utility
 * Enforces password strength requirements
 */

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, errors: string[]}} - Validation result
 */
export function validatePassword(password) {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      errors: ['Password is required'],
    };
  }

  // Minimum length: 8 characters
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Maximum length: 128 characters (prevent DoS)
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // At least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // At least one number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // At least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password',
    'password123',
    '12345678',
    'qwerty',
    'abc123',
    'letmein',
    'welcome',
    'admin',
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a stronger password');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get password strength score (0-4)
 * @param {string} password - Password to score
 * @returns {number} - Strength score (0 = weak, 4 = very strong)
 */
export function getPasswordStrength(password) {
  if (!password) return 0;

  let score = 0;

  // Length bonus
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character variety
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  return Math.min(score, 4);
}

/**
 * Get human-readable password strength
 * @param {string} password - Password to evaluate
 * @returns {string} - Strength level
 */
export function getPasswordStrengthLabel(password) {
  const score = getPasswordStrength(password);
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return labels[score] || 'Very Weak';
}
