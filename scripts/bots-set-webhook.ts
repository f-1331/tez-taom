import { getStaffBotClient, getCustomerBotClient } from '../src/server/telegram/client';

async function setWebhooks() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  if (!appUrl.startsWith('https://')) {
    console.error('❌ Xatolik: Webhook o‘rnatish uchun HTTPS domeni talab qilinadi (masalan: https://teztaom.uz yoki ngrok URL)');
    process.exit(1);
  }

  const staffSecret = process.env.TELEGRAM_STAFF_WEBHOOK_SECRET || 'staff_secret_xyz123_teztaom';
  const customerSecret = process.env.TELEGRAM_CUSTOMER_WEBHOOK_SECRET || 'customer_secret_xyz123_teztaom';

  const staffUrl = `${appUrl}/api/webhooks/telegram/staff`;
  const customerUrl = `${appUrl}/api/webhooks/telegram/customer`;

  console.log(`📡 Staff Bot webhook o‘rnatilmoqda: ${staffUrl}`);
  const staffClient = getStaffBotClient();
  const res1 = await staffClient.setWebhook(staffUrl, staffSecret);
  console.log('Natija:', res1);

  console.log(`📡 Customer Bot webhook o‘rnatilmoqda: ${customerUrl}`);
  const customerClient = getCustomerBotClient();
  const res2 = await customerClient.setWebhook(customerUrl, customerSecret);
  console.log('Natija:', res2);
}

setWebhooks().catch(console.error);
