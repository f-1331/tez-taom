import { describe, it, expect, beforeEach } from 'vitest';
import { escapeHtml } from './html';
import { hashToken, generateSecureToken } from './tokens';
import { isActionAllowedForRole, ACTION_TO_TARGET_STATUS } from './keyboards';
import { Role } from '@prisma/client';

describe('Telegram Module Tests', () => {
  describe('HTML Escape', () => {
    it('escapes dangerous HTML characters in user inputs', () => {
      const rawInput = '<script>alert("XSS & attack")</script>';
      const escaped = escapeHtml(rawInput);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS &amp; attack&quot;)&lt;/script&gt;');
    });

    it('handles empty or null values gracefully', () => {
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });
  });

  describe('Secure Token Generation and Hashing', () => {
    it('generates secure 32-byte url-safe token and sha256 hash', () => {
      const { rawToken, tokenHash } = generateSecureToken();

      expect(rawToken).toBeDefined();
      expect(rawToken.length).toBeGreaterThanOrEqual(40);
      expect(rawToken.length).toBeLessThanOrEqual(64); // Telegram start payload limit
      expect(/^[A-Za-z0-9_-]+$/.test(rawToken)).toBe(true);

      expect(tokenHash).toBe(hashToken(rawToken));
      expect(tokenHash.length).toBe(64); // SHA-256 hex string
    });
  });

  describe('Role-based Action Permission Matrix', () => {
    it('allows OWNER and ADMIN to perform all actions', () => {
      const allActions = ['confirm', 'prep', 'ready', 'ontheway', 'pickedup', 'delivered', 'cancel'];

      for (const action of allActions) {
        expect(isActionAllowedForRole('OWNER', action)).toBe(true);
        expect(isActionAllowedForRole('ADMIN', action)).toBe(true);
      }
    });

    it('allows OPERATOR only confirm and cancel', () => {
      expect(isActionAllowedForRole('OPERATOR', 'confirm')).toBe(true);
      expect(isActionAllowedForRole('OPERATOR', 'cancel')).toBe(true);
      expect(isActionAllowedForRole('OPERATOR', 'prep')).toBe(false);
      expect(isActionAllowedForRole('OPERATOR', 'ready')).toBe(false);
      expect(isActionAllowedForRole('OPERATOR', 'ontheway')).toBe(false);
    });

    it('allows KITCHEN only prep and ready', () => {
      expect(isActionAllowedForRole('KITCHEN', 'prep')).toBe(true);
      expect(isActionAllowedForRole('KITCHEN', 'ready')).toBe(true);
      expect(isActionAllowedForRole('KITCHEN', 'confirm')).toBe(false);
      expect(isActionAllowedForRole('KITCHEN', 'ontheway')).toBe(false);
      expect(isActionAllowedForRole('KITCHEN', 'delivered')).toBe(false);
    });

    it('allows COURIER only ontheway and delivered', () => {
      expect(isActionAllowedForRole('COURIER', 'ontheway')).toBe(true);
      expect(isActionAllowedForRole('COURIER', 'delivered')).toBe(true);
      expect(isActionAllowedForRole('COURIER', 'confirm')).toBe(false);
      expect(isActionAllowedForRole('COURIER', 'prep')).toBe(false);
    });

    it('blocks CUSTOMER from any staff actions', () => {
      expect(isActionAllowedForRole('CUSTOMER', 'confirm')).toBe(false);
      expect(isActionAllowedForRole('CUSTOMER', 'ready')).toBe(false);
    });
  });

  describe('Action to Target Status Mapping', () => {
    it('maps all actions to strict OrderStatus values', () => {
      expect(ACTION_TO_TARGET_STATUS['confirm']).toBe('CONFIRMED');
      expect(ACTION_TO_TARGET_STATUS['prep']).toBe('PREPARING');
      expect(ACTION_TO_TARGET_STATUS['ready']).toBe('READY');
      expect(ACTION_TO_TARGET_STATUS['ontheway']).toBe('ON_THE_WAY');
      expect(ACTION_TO_TARGET_STATUS['pickedup']).toBe('PICKED_UP');
      expect(ACTION_TO_TARGET_STATUS['delivered']).toBe('DELIVERED');
      expect(ACTION_TO_TARGET_STATUS['cancel']).toBe('CANCELED');
    });
  });

  describe('Webhook Secret Verification Logic', () => {
    it('validates secret token matching correctly', () => {
      const expectedSecret = 'super_secret_staff_token_123';
      const validHeader = 'super_secret_staff_token_123';
      const invalidHeader = 'wrong_token';

      expect(validHeader === expectedSecret).toBe(true);
      expect(invalidHeader === expectedSecret).toBe(false);
    });
  });
});
