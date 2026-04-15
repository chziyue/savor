/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Savor
 *
 * This file is part of Savor.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from './rate-limiter.js';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      requestsPerMinute: 5,
      windowMs: 60000,
      permanentLock: false,
    });
  });

  describe('getClientId', () => {
    it('should extract client ID from X-Forwarded-For header', () => {
      const req = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      };
      expect(limiter.getClientId(req)).toBe('192.168.1.1');
    });

    it('should extract client ID from X-Real-IP header', () => {
      const req = {
        headers: {
          'x-real-ip': '192.168.1.2',
        },
      };
      expect(limiter.getClientId(req)).toBe('192.168.1.2');
    });

    it('should fallback to socket remote address', () => {
      const req = {
        headers: {},
        socket: { remoteAddress: '192.168.1.3' },
      };
      expect(limiter.getClientId(req)).toBe('192.168.1.3');
    });
  });

  describe('check', () => {
    it('should allow requests under the limit', () => {
      const req = { headers: {}, ip: '192.168.1.1' };
      
      for (let i = 0; i < 5; i++) {
        const result = limiter.check(req);
        expect(result.allowed).toBe(true);
      }
    });

    it('should deny requests over the limit', () => {
      const req = { headers: {}, ip: '192.168.1.1' };
      
      // Use up the limit
      for (let i = 0; i < 5; i++) {
        limiter.check(req);
      }
      
      // Next request should be denied
      const result = limiter.check(req);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track different clients separately', () => {
      const req1 = { headers: {}, ip: '192.168.1.1' };
      const req2 = { headers: {}, ip: '192.168.1.2' };
      
      // Use up limit for client 1
      for (let i = 0; i < 5; i++) {
        limiter.check(req1);
      }
      
      // Client 2 should still be allowed
      const result = limiter.check(req2);
      expect(result.allowed).toBe(true);
    });

    it('should return remaining count', () => {
      const req = { headers: {}, ip: '192.168.1.1' };
      
      const result1 = limiter.check(req);
      expect(result1.remaining).toBe(4);
      
      const result2 = limiter.check(req);
      expect(result2.remaining).toBe(3);
    });
  });

  describe('unlock', () => {
    it('should unlock a specific client', () => {
      const req = { headers: {}, ip: '192.168.1.1' };
      
      // Use up limit and lock
      const lockLimiter = new RateLimiter({
        requestsPerMinute: 2,
        permanentLock: true,
      });
      
      lockLimiter.check(req);
      lockLimiter.check(req);
      lockLimiter.check(req); // This triggers lock
      
      const result = lockLimiter.unlock('192.168.1.1');
      expect(result.success).toBe(true);
    });

    it('should return false for non-existent client', () => {
      const result = limiter.unlock('non-existent');
      expect(result.success).toBe(false);
    });
  });

  describe('getAllStatus', () => {
    it('should return status for all clients', () => {
      const req1 = { headers: {}, ip: '192.168.1.1' };
      const req2 = { headers: {}, ip: '192.168.1.2' };
      
      limiter.check(req1);
      limiter.check(req2);
      
      const statuses = limiter.getAllStatus();
      expect(statuses).toHaveLength(2);
    });
  });
});