import { describe, it, expect } from 'vitest';
import { filterText, filterObject, getFilterMarkers } from './filter.js';

describe('filterText', () => {
  it('should filter phone numbers', () => {
    const text = '我的手机号是 13812345678 请联系我';
    const result = filterText(text);
    
    expect(result.filtered).toBe(true);
    expect(result.text).not.toContain('13812345678');
    expect(result.categories).toContain('privacy');
  });

  it('should filter email addresses', () => {
    const text = '联系邮箱：test@example.com';
    const result = filterText(text);
    
    expect(result.filtered).toBe(true);
    expect(result.text).not.toContain('test@example.com');
  });

  it('should filter ID card numbers', () => {
    const text = '身份证号：110101199001011234';
    const result = filterText(text);
    
    expect(result.filtered).toBe(true);
    expect(result.text).not.toContain('110101199001011234');
  });

  it('should filter bearer tokens', () => {
    const text = 'Authorization: bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const result = filterText(text);
    
    expect(result.filtered).toBe(true);
    expect(result.text).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });

  it('should filter passwords', () => {
    const text = 'password: mySecretPass123';
    const result = filterText(text);
    
    expect(result.filtered).toBe(true);
    expect(result.text).not.toContain('mySecretPass123');
  });

  it('should return unchanged text when disabled', () => {
    const text = '手机号 13812345678';
    const result = filterText(text, { 
      enabled: false, 
      categories: { privacy: true }, 
      replacements: { privacy: '<filtered>' } 
    });
    
    expect(result.filtered).toBe(false);
    expect(result.text).toBe(text);
  });

  it('should handle multiple sensitive items', () => {
    const text = '手机：13812345678，邮箱：test@example.com';
    const result = filterText(text);
    
    expect(result.filtered).toBe(true);
    expect(result.details.length).toBeGreaterThanOrEqual(2);
  });
});

describe('filterObject', () => {
  it('should filter user message content', () => {
    const obj = {
      messages: [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: '我的手机号是 13812345678' }
      ]
    };
    
    const result = filterObject(obj);
    
    expect(result.categories).toContain('privacy');
    expect(result.data.messages[1].content).not.toContain('13812345678');
  });

  it('should not filter system messages', () => {
    const obj = {
      messages: [
        { role: 'system', content: '13812345678' }
      ]
    };
    
    const result = filterObject(obj);
    
    expect(result.categories).toHaveLength(0);
    expect(result.data.messages[0].content).toBe('13812345678');
  });

  it('should handle array content format', () => {
    const obj = {
      messages: [
        { 
          role: 'user', 
          content: [
            { type: 'text', text: '手机号 13812345678' }
          ]
        }
      ]
    };
    
    const result = filterObject(obj);
    
    expect(result.categories).toContain('privacy');
  });
});

describe('getFilterMarkers', () => {
  it('should return privacy marker for privacy category', () => {
    const markers = getFilterMarkers(['privacy']);
    expect(markers).toContain('🔒Privacy');
  });

  it('should return empty array for empty categories', () => {
    const markers = getFilterMarkers([]);
    expect(markers).toHaveLength(0);
  });
});