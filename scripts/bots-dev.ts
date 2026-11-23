import { getStaffBotClient, getCustomerBotClient } from '../src/server/telegram/client';
import { handleTelegramUpdate } from '../src/server/telegram/handlers';

async function startPolling() {
  console.log('🤖 [Telegram Polling] Botlar lokal rivojlanish rejimida ishga tushmoqda...\n');

  const staffClient = getStaffBotClient();
  const customerClient = getCustomerBotClient();

  // Webhooklarni tozalash (polling bilan to'qnashmasligi uchun)
  console.log('🧹 Webhooklar tozalanmoqda...');
  await staffClient.deleteWebhook(true);
  await customerClient.deleteWebhook(true);
  console.log('✅ Webhooklar tozalandi. getUpdates polling boshlandi.');

  let staffOffset: number | undefined;
  let customerOffset: number | undefined;
  let isRunning = true;

  process.on('SIGINT', () => {
    console.log('\n🛑 Polling to‘xtatilmoqda...');
    isRunning = false;
    process.exit(0);
  });

  // Staff Bot Polling Loop
  const pollStaff = async () => {
    while (isRunning) {
      try {
        const res = await staffClient.getUpdates(staffOffset, 100, 20);
        if (res.ok && res.result && Array.isArray(res.result)) {
          for (const update of res.result) {
            staffOffset = update.update_id + 1;
            handleTelegramUpdate('staff', update).catch((e) =>
              console.error('[StaffBot Update Error]:', e)
            );
          }
        }
      } catch (err: any) {
        console.error('[StaffBot Poll Error]:', err.message);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  };

  // Customer Bot Polling Loop (agar haqiqiy token bo'lsa)
  const pollCustomer = async () => {
    const token = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN;
    if (!token || token.startsWith('mock_')) return;

    while (isRunning) {
      try {
        const res = await customerClient.getUpdates(customerOffset, 100, 20);
        if (res.ok && res.result && Array.isArray(res.result)) {
          for (const update of res.result) {
            customerOffset = update.update_id + 1;
            handleTelegramUpdate('customer', update).catch((e) =>
              console.error('[CustomerBot Update Error]:', e)
            );
          }
        }
      } catch (err: any) {
        console.error('[CustomerBot Poll Error]:', err.message);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  };

  console.log('🚀 [Telegram Polling] Xodimlar boti faol va yangilanishlarni kutmoqda!\n');
  await Promise.all([pollStaff(), pollCustomer()]);
}

startPolling().catch(console.error);
