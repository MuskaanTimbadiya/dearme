export interface ValidationRule {
  field: string;
  type: 'string' | 'array' | 'object' | 'number' | 'boolean';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: any[];
  itemsSchema?: ValidationRule[];
}

export function validatePayload(
  data: any,
  rules: ValidationRule[],
  allowUnknownKeys = false
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Request payload must be a JSON object.'] };
  }

  const allowedKeys = new Set(rules.map((r) => r.field));
  if (!allowUnknownKeys) {
    const unknownKeys = Object.keys(data).filter((k) => !allowedKeys.has(k));
    if (unknownKeys.length > 0) {
      errors.push(`Unexpected properties not allowed in strict schema: ${unknownKeys.join(', ')}.`);
    }
  }

  for (const rule of rules) {
    const val = data[rule.field];

    if (val === undefined || val === null || val === '') {
      if (rule.required) {
        errors.push(`Field '${rule.field}' is required.`);
      }
      continue;
    }

    if (rule.type === 'array') {
      if (!Array.isArray(val)) {
        errors.push(`Field '${rule.field}' must be an array.`);
        continue;
      }
      if (rule.minLength !== undefined && val.length < rule.minLength) {
        errors.push(`Field '${rule.field}' array length must be at least ${rule.minLength}.`);
      }
      if (rule.maxLength !== undefined && val.length > rule.maxLength) {
        errors.push(`Field '${rule.field}' array length cannot exceed ${rule.maxLength}.`);
      }

      if (rule.itemsSchema) {
        val.forEach((item: any, idx: number) => {
          const subValidation = validatePayload(item, rule.itemsSchema!, allowUnknownKeys);
          if (!subValidation.valid) {
            subValidation.errors.forEach((e) =>
              errors.push(`Field '${rule.field}[${idx}]': ${e}`)
            );
          }
        });
      }
    } else if (rule.type === 'string') {
      if (typeof val !== 'string') {
        errors.push(`Field '${rule.field}' must be a string.`);
        continue;
      }
      if (rule.minLength !== undefined && val.length < rule.minLength) {
        errors.push(`Field '${rule.field}' length must be at least ${rule.minLength} characters.`);
      }
      if (rule.maxLength !== undefined && val.length > rule.maxLength) {
        errors.push(`Field '${rule.field}' length cannot exceed ${rule.maxLength} characters.`);
      }
      if (rule.pattern && !rule.pattern.test(val)) {
        errors.push(`Field '${rule.field}' does not match the required format.`);
      }
      if (rule.enum && !rule.enum.includes(val)) {
        errors.push(`Field '${rule.field}' must be one of: ${rule.enum.join(', ')}.`);
      }
    } else {
      if (typeof val !== rule.type) {
        errors.push(`Field '${rule.field}' must be of type ${rule.type}.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
