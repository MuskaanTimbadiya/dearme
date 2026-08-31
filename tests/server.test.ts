import { describe, it, expect } from 'vitest';
import { validatePayload, type ValidationRule } from '../src/lib/payloadValidation';

describe('Server Payload Validation (validatePayload)', () => {
  const sampleRules: ValidationRule[] = [
    { field: 'title', type: 'string', required: true, minLength: 3, maxLength: 50 },
    { field: 'mode', type: 'string', required: false, enum: ['reflective', 'brainstorm'] },
    { field: 'count', type: 'number', required: false },
  ];

  it('should accept valid payloads matching schema', () => {
    const validData = { title: 'Hello Reflection', mode: 'reflective' };
    const result = validatePayload(validData, sampleRules, false);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject non-object payloads', () => {
    const result = validatePayload('not an object', sampleRules);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('must be a JSON object');
  });

  it('should flag missing required fields', () => {
    const invalidData = { mode: 'brainstorm' };
    const result = validatePayload(invalidData, sampleRules, false);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Field 'title' is required.");
  });

  it('should enforce enum restrictions', () => {
    const invalidData = { title: 'Test Title', mode: 'invalid_mode' };
    const result = validatePayload(invalidData, sampleRules, false);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("must be one of: reflective, brainstorm");
  });

  it('should reject unexpected unknown properties in strict mode', () => {
    const dataWithUnknown = { title: 'Test Title', maliciousKey: 'hacked' };
    const result = validatePayload(dataWithUnknown, sampleRules, false);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Unexpected properties not allowed');
  });

  it('should validate chat payload schema with optional callbacks array', () => {
    const chatRules: ValidationRule[] = [
      {
        field: 'messages',
        type: 'array',
        required: true,
        minLength: 1,
        maxLength: 100,
      },
      { field: 'mode', type: 'string', required: false, enum: ['reflective', 'brainstorm', 'actionable', 'summary'] },
      { field: 'entryTitle', type: 'string', required: false, maxLength: 100 },
      { field: 'callbacks', type: 'array', required: false, maxLength: 10 },
      { field: 'language', type: 'string', required: false, enum: ['en', 'hi', 'gu'] },
    ];

    const validChatPayload = {
      messages: [{ role: 'user', content: 'Feeling anxious about the exam' }],
      mode: 'reflective',
      entryTitle: 'Exam Preparation',
      callbacks: ['Mentioned an upcoming exam on Oct 14 causing anxiety'],
      language: 'hi',
    };

    const result = validatePayload(validChatPayload, chatRules, false);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
