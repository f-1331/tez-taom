import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createOwnerBindToken, verifyAndConsumeToken } from './tokens';
import { TelegramLinkTokenKind } from '@prisma/client';

describe('Owner Telegram Binding Flow Integration Tests', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Test owner user
    const user = await prisma.user.upsert({
      where: { email: 'test_owner_bind@teztaom.uz' },
      update: {},
      create: {
        name: 'Test Owner',
        email: 'test_owner_bind@teztaom.uz',
        phone: '+998909999999',
        role: 'OWNER',
        telegramUsername: 'fayzbek1331',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.telegramLinkToken.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  });

  it('creates and verifies a valid owner bind token', async () => {
    const { rawToken, link, expiresAt } = await createOwnerBindToken(testUserId);

    expect(rawToken).toBeDefined();
    expect(link).toContain(rawToken);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Verify and consume token
    const res = await verifyAndConsumeToken(rawToken, TelegramLinkTokenKind.OWNER_BIND);
    expect(res.valid).toBe(true);
    expect(res.tokenRecord).toBeDefined();
    expect(res.tokenRecord.usedAt).not.toBeNull();
  });

  it('rejects an already used token (one-time protection)', async () => {
    const { rawToken } = await createOwnerBindToken(testUserId);

    // 1st consumption: OK
    const firstRes = await verifyAndConsumeToken(rawToken, TelegramLinkTokenKind.OWNER_BIND);
    expect(firstRes.valid).toBe(true);

    // 2nd consumption: REJECTED
    const secondRes = await verifyAndConsumeToken(rawToken, TelegramLinkTokenKind.OWNER_BIND);
    expect(secondRes.valid).toBe(false);
    expect(secondRes.error).toContain('allaqachon ishlatilgan');
  });

  it('rejects an expired token (>15 minutes)', async () => {
    const { rawToken, link } = await createOwnerBindToken(testUserId);

    // Sun'iy ravishda tokenni o'tmishga o'tkazish
    const tokenRecord = await prisma.telegramLinkToken.findFirst({
      where: { userId: testUserId, usedAt: null },
    });

    if (tokenRecord) {
      await prisma.telegramLinkToken.update({
        where: { id: tokenRecord.id },
        data: { expiresAt: new Date(Date.now() - 60 * 1000) }, // 1 min ago
      });
    }

    const res = await verifyAndConsumeToken(rawToken, TelegramLinkTokenKind.OWNER_BIND);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('muddati');
  });

  it('rejects a fake non-existent token', async () => {
    const res = await verifyAndConsumeToken('completely_fake_token_123', TelegramLinkTokenKind.OWNER_BIND);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('topilmadi');
  });
});
