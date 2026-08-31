import { describe, it, expect } from 'vitest';
import { getTranslation, TRANSLATIONS } from '../src/lib/translations';

describe('Multilingual Translation Dictionary (getTranslation)', () => {
  it('should return English dictionary by default', () => {
    const t = getTranslation('en');
    expect(t.appName).toBe('DearMe');
    expect(t.languageName).toBe('English');
    expect(t.newReflection).toBe('New Reflection');
  });

  it('should return Hindi dictionary when lang is hi', () => {
    const t = getTranslation('hi');
    expect(t.languageName).toBe('हिन्दी');
    expect(t.newReflection).toBe('नई अभिव्यक्ति');
    expect(t.pastReflections).toBe('पिछली यादें');
  });

  it('should return Gujarati dictionary when lang is gu', () => {
    const t = getTranslation('gu');
    expect(t.languageName).toBe('ગુજરાતી');
    expect(t.newReflection).toBe('નવું ચિંતન');
    expect(t.pastReflections).toBe('પાછલા સંસ્મરણો');
  });

  it('should fallback to English for unknown language code', () => {
    const t = getTranslation('unknown' as any);
    expect(t.languageName).toBe('English');
  });

  it('should have matching key structures across all supported languages', () => {
    const enKeys = Object.keys(TRANSLATIONS.en).sort();
    const hiKeys = Object.keys(TRANSLATIONS.hi).sort();
    const guKeys = Object.keys(TRANSLATIONS.gu).sort();

    expect(hiKeys).toEqual(enKeys);
    expect(guKeys).toEqual(enKeys);
  });
});
