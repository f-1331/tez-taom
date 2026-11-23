import { prisma } from '../src/lib/prisma';
import { getStaffBotClient, getCustomerBotClient } from '../src/server/telegram/client';

async function checkBots() {
  console.log('\n🔍 --- TEZ-TAOM TELEGRAM BOTS DIAGNOSTIKA ---\n');

  // 1. Staff Bot tekshiruvi
  console.log('1. XODIMLAR BOTI (Staff Bot):');
  const staffClient = getStaffBotClient();
  const staffMe = await staffClient.getMe();
  if (staffMe.ok && staffMe.result) {
    console.log(`   ✅ Bot ulandi: @${staffMe.result.username} (ID: ${staffMe.result.id}, Ismi: "${staffMe.result.first_name}")`);
  } else {
    console.log(`   ❌ Ulanish xatosi: ${staffMe.description || 'Token noto‘g‘ri yoki mavjud emas'}`);
  }

  const staffWebhook = await staffClient.getWebhookInfo();
  if (staffWebhook.ok && staffWebhook.result) {
    console.log(`   ℹ️ Webhook holati: URL="${staffWebhook.result.url || '(Yo‘q - Polling rejimiga tayyor)'}" (Kutilayotgan yangilanishlar: ${staffWebhook.result.pending_update_count})`);
  }

  // Staff chat tekshiruvi
  const staffChatSetting = await prisma.setting.findUnique({
    where: { key: 'staffChatId' },
  });
  const staffChatId = staffChatSetting?.value || process.env.TELEGRAM_STAFF_CHAT_ID || '(Belgilanmagan)';
  console.log(`   ℹ️ Xodimlar guruhi (Chat ID): ${staffChatId}`);

  // 2. Customer Bot tekshiruvi
  console.log('\n2. MIJOZ BOTI (Customer Bot):');
  const customerClient = getCustomerBotClient();
  const customerMe = await customerClient.getMe();
  if (customerMe.ok && customerMe.result) {
    console.log(`   ✅ Bot ulandi: @${customerMe.result.username} (ID: ${customerMe.result.id}, Ismi: "${customerMe.result.first_name}")`);
  } else {
    console.log(`   ⚠️ Ulanish holati: ${customerMe.description || 'Customer bot tokeni mock/kiritilmagan'}`);
  }

  const customerWebhook = await customerClient.getWebhookInfo();
  if (customerWebhook.ok && customerWebhook.result) {
    console.log(`   ℹ️ Webhook holati: URL="${customerWebhook.result.url || '(Yo‘q - Polling rejimiga tayyor)'}"`);
  }

  // 3. Owner bog'lanish holati
  console.log('\n3. LOYIHA EGASI (OWNER) BOG‘LANISHI:');
  const owner = await prisma.user.findFirst({
    where: { role: 'OWNER' },
  });

  if (owner) {
    const isBound = owner.telegramId !== null;
    console.log(`   👤 Owner: ${owner.name} (${owner.email})`);
    console.log(`   📱 Kutilgan Telegram username: @${owner.telegramUsername || process.env.OWNER_TELEGRAM_USERNAME || 'fayzbek1331'}`);
    if (isBound) {
      console.log(`   ✅ Telegram hisobi bog‘langan! (Telegram ID: ${owner.telegramId})`);
    } else {
      console.log(`   ⚠️ Telegram hisobi hali bog‘lanmagan. Bog‘lash uchun admin paneldan yoki token generatsiya qilib /start bind_<token> yuboring.`);
    }
  } else {
    console.log(`   ❌ Owner foydalanuvchi bazada topilmadi.`);
  }

  console.log('\n--------------------------------------------\n');
}

checkBots()
  .catch((err) => {
    console.error('Xatolik:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
