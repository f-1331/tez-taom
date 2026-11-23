import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { TelegramLinkTokenKind, Role } from '@prisma/client';

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateSecureToken(): { rawToken: string; tokenHash: string } {
  // 32 bayt tasodifiy kriptografik ma'lumot
  const rawToken = crypto.randomBytes(32).toString('base64url'); // 43 ta belgi, A-Z a-z 0-9 _ -
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

export async function createOwnerBindToken(ownerId: string): Promise<{ rawToken: string; link: string; expiresAt: Date }> {
  const { rawToken, tokenHash } = generateSecureToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 daqiqa

  await prisma.telegramLinkToken.create({
    data: {
      kind: TelegramLinkTokenKind.OWNER_BIND,
      tokenHash,
      userId: ownerId,
      expiresAt,
    },
  });

  const staffBotUsername = process.env.TELEGRAM_STAFF_BOT_USERNAME || 'tez_taom_uz_bot';
  const link = `https://t.me/${staffBotUsername}?start=bind_${rawToken}`;

  return { rawToken, link, expiresAt };
}

export interface VerifyTokenResult {
  valid: boolean;
  tokenRecord?: any;
  error?: string;
}

export async function verifyAndConsumeToken(
  rawToken: string,
  expectedKind: TelegramLinkTokenKind
): Promise<VerifyTokenResult> {
  const tokenHash = hashToken(rawToken);

  const tokenRecord = await prisma.telegramLinkToken.findUnique({
    where: { tokenHash },
  });

  if (!tokenRecord) {
    return { valid: false, error: 'Token topilmadi yoki noto‘g‘ri' };
  }

  if (tokenRecord.kind !== expectedKind) {
    return { valid: false, error: 'Token turi mos kelmadi' };
  }

  if (tokenRecord.usedAt !== null) {
    return { valid: false, error: 'Bu havola allaqachon ishlatilgan' };
  }

  if (tokenRecord.expiresAt < new Date()) {
    return { valid: false, error: 'Havolaning amal qilish muddati (15 daqiqa) tugagan' };
  }

  // Tokenni ishlatilgan deb belgilash
  const updated = await prisma.telegramLinkToken.update({
    where: { id: tokenRecord.id },
    data: { usedAt: new Date() },
  });

  return { valid: true, tokenRecord: updated };
}
