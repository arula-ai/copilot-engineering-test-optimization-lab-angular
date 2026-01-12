import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Email validator
 */
export function emailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid = emailRegex.test(control.value);

    return valid ? null : { email: { value: control.value } };
  };
}

/**
 * Password strength validator
 */
export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const password = control.value;
    const errors: ValidationErrors = {};

    if (password.length < 8) {
      errors['minLength'] = { requiredLength: 8, actualLength: password.length };
    }

    if (!/[A-Z]/.test(password)) {
      errors['uppercase'] = true;
    }

    if (!/[a-z]/.test(password)) {
      errors['lowercase'] = true;
    }

    if (!/\d/.test(password)) {
      errors['number'] = true;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors['specialChar'] = true;
    }

    return Object.keys(errors).length > 0 ? { passwordStrength: errors } : null;
  };
}

/**
 * Phone number validator
 */
export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    const valid = phoneRegex.test(control.value);

    return valid ? null : { phone: { value: control.value } };
  };
}

/**
 * Credit card number validator (Luhn algorithm)
 */
export function creditCardValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const sanitized = control.value.replace(/\D/g, '');

    if (sanitized.length < 13 || sanitized.length > 19) {
      return { creditCard: { reason: 'length', value: control.value } };
    }

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = sanitized.length - 1; i >= 0; i--) {
      let digit = parseInt(sanitized[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0 ? null : { creditCard: { reason: 'luhn', value: control.value } };
  };
}

/**
 * Card expiry validator
 */
export function cardExpiryValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const match = control.value.match(/^(\d{2})\/(\d{2})$/);
    if (!match) {
      return { cardExpiry: { reason: 'format', value: control.value } };
    }

    const month = parseInt(match[1], 10);
    const year = parseInt(match[2], 10) + 2000;

    if (month < 1 || month > 12) {
      return { cardExpiry: { reason: 'month', value: control.value } };
    }

    const now = new Date();
    const expiryDate = new Date(year, month - 1);

    if (expiryDate <= now) {
      return { cardExpiry: { reason: 'expired', value: control.value } };
    }

    return null;
  };
}

/**
 * CVV validator
 */
export function cvvValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const valid = /^\d{3,4}$/.test(control.value);
    return valid ? null : { cvv: { value: control.value } };
  };
}

/**
 * Postal code validator
 */
export function postalCodeValidator(country = 'US'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const patterns: Record<string, RegExp> = {
      US: /^\d{5}(-\d{4})?$/,
      UK: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
      CA: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,
      DE: /^\d{5}$/,
      FR: /^\d{5}$/
    };

    const pattern = patterns[country] || /^[\w\s-]{3,10}$/;
    const valid = pattern.test(control.value);

    return valid ? null : { postalCode: { country, value: control.value } };
  };
}

/**
 * Match field validator (e.g., password confirmation)
 */
export function matchFieldValidator(fieldName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const parent = control.parent;
    if (!parent) {
      return null;
    }

    const fieldToMatch = parent.get(fieldName);
    if (!fieldToMatch) {
      return null;
    }

    if (control.value !== fieldToMatch.value) {
      return { matchField: { field: fieldName } };
    }

    return null;
  };
}

/**
 * Minimum amount validator
 */
export function minAmountValidator(minAmount: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value && control.value !== 0) {
      return null;
    }

    const value = parseFloat(control.value);
    if (isNaN(value)) {
      return { minAmount: { min: minAmount, actual: control.value } };
    }

    return value >= minAmount ? null : { minAmount: { min: minAmount, actual: value } };
  };
}

/**
 * Maximum amount validator
 */
export function maxAmountValidator(maxAmount: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value && control.value !== 0) {
      return null;
    }

    const value = parseFloat(control.value);
    if (isNaN(value)) {
      return { maxAmount: { max: maxAmount, actual: control.value } };
    }

    return value <= maxAmount ? null : { maxAmount: { max: maxAmount, actual: value } };
  };
}

/**
 * Date range validator
 */
export function dateRangeValidator(minDate?: Date, maxDate?: Date): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const date = new Date(control.value);
    if (isNaN(date.getTime())) {
      return { dateRange: { reason: 'invalid' } };
    }

    if (minDate && date < minDate) {
      return { dateRange: { reason: 'tooEarly', min: minDate, actual: date } };
    }

    if (maxDate && date > maxDate) {
      return { dateRange: { reason: 'tooLate', max: maxDate, actual: date } };
    }

    return null;
  };
}

/**
 * Age validator (must be at least minAge years old)
 */
export function ageValidator(minAge: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const birthDate = new Date(control.value);
    if (isNaN(birthDate.getTime())) {
      return { age: { reason: 'invalid' } };
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= minAge ? null : { age: { minAge, actualAge: age } };
  };
}

/**
 * No whitespace validator
 */
export function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const hasWhitespace = /\s/.test(control.value);
    return hasWhitespace ? { whitespace: true } : null;
  };
}

/**
 * URL validator
 */
export function urlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    try {
      new URL(control.value);
      return null;
    } catch {
      return { url: { value: control.value } };
    }
  };
}
