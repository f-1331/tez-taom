# "Tez-Taom" — Telegram Botlarni Sozlash Qo‘llanmasi

Ushbu hujjat "Tez-Taom" platformasining 2 ta Telegram botini (Xodimlar boti va Mijoz boti) sozlash, bog‘lash va ishga tushirish bo‘yicha to‘liq qo‘llanma hisoblanadi.

---

## 1. BotFather orqali Botlarni Yaratish

Telegram’da [@BotFather](https://t.me/BotFather) botiga kiring va quyidagi buyruqlar orqali 2 ta alohida bot yarating:

### 1.1. Xodimlar Boti (Staff Bot)
1. `/newbot` buyrug‘ini yuboring.
2. Bot nomini kiriting: `Tez-Taom Xodimlar Boti`
3. Bot username kiriting: masalan `tez_taom_uz_bot` (yoki o‘zingiz xohlagan nom).
4. BotFather bergan **HTTP API Token**ni nusxalang.
5. Bot buyruqlarini sozlash uchun `/setcommands` yuboring, yaratilgan botni tanlang va quyidagi ro‘yxatni yuboring:
```text
orders - Faol buyurtmalar ro'yxati
today - Bugungi buyurtmalar soni va tushum
open - Buyurtma qabul qilishni yoqish (Admin/Owner)
close - Buyurtma qabul qilishni to'xtatish (Admin/Owner)
chatid - Ushbu chat ID sini ko'rish
setgroup - Guruhni buyurtmalar guruhi qilib belgilash (Faqat Owner)
help - Yordam va buyruqlar ma'lumoti
```

### 1.2. Mijoz Boti (Customer Bot)
1. `/newbot` buyrug‘ini yuboring.
2. Bot nomini kiriting: `Tez-Taom Buyurtma Boti`
3. Bot username kiriting: masalan `tez_taom_customer_bot`.
4. BotFather bergan **HTTP API Token**ni nusxalang.

---

## 2. `.env` Faylini To‘ldirish

Loyiha ildizidagi `.env` faylida quyidagi parametrlarni kiriting:

```env
# Loyiha egasi (Owner: @fayzbek1331)
OWNER_EMAIL="owner@teztaom.uz"
OWNER_PASSWORD="OwnerTezTaom2026!"
OWNER_TELEGRAM_USERNAME="fayzbek1331"

# Bot rejimi: lokal uchun "polling", production uchun "webhook"
TELEGRAM_MODE="polling"

# Xodimlar boti
TELEGRAM_STAFF_BOT_TOKEN="9061065074:AAE8zYfVEUfHj2X-pfFgPiZqfQQ_hqssSO0"
TELEGRAM_STAFF_BOT_USERNAME="tez_taom_uz_bot"
TELEGRAM_STAFF_WEBHOOK_SECRET="staff_secret_xyz123_teztaom"
TELEGRAM_STAFF_CHAT_ID=""

# Mijoz boti
TELEGRAM_CUSTOMER_BOT_TOKEN="your_customer_bot_token"
TELEGRAM_CUSTOMER_BOT_USERNAME="tez_taom_customer_bot"
TELEGRAM_CUSTOMER_WEBHOOK_SECRET="customer_secret_xyz123_teztaom"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 3. Diagnostika va Ulanishni Tekshirish

Har qanday sozlashdan so‘ng tizimni tekshirish uchun quyidagi buyruqni bering:
```bash
npm run bots:check
```
Ushbu buyruq quyidagilarni ko‘rsatadi:
- Xodimlar boti tokeni to‘g‘riligi va bot ma’lumotlari;
- Mijoz boti tokeni holati;
- Xodimlar guruhi chat ID si belgilanganligi;
- Loyiha egasi (`@fayzbek1331`) hisobi bog‘langanligi.

---

## 4. Loyiha Egasini (OWNER) Bog‘lash

Telegram cheklovlariga ko‘ra, bot foydalanuvchiga birinchi bo‘lib yozolmaydi. Shuning uchun Owner bir marta bot bilan muloqotni boshlashi shart:

1. Admin paneldan yoki API orqali bir martalik xavfsiz bog‘lanish havolasini oling:
   - `POST /api/admin/telegram/bind-token` so‘rovi havola qaytaradi:
     `https://t.me/<STAFF_BOT_USERNAME>?start=bind_<TOKEN>`
2. Loyiha egasi (`@fayzbek1331`) Telegram hisobi orqali shu havolani ochadi va **Start (Boshlash)** tugmasini bosadi.
3. Bot quyidagilarni tekshiradi:
   - Token DB da mavjudligi va 15 daqiqa ichida olinganligi;
   - Xabar yuboruvchining Telegram username’i `.env`dagi `OWNER_TELEGRAM_USERNAME=fayzbek1331` bilan mos kelishi.
4. Barcha shartlar to‘g‘ri kelsa, owner’ning raqamli `telegramId`si bazada saqlanadi, token yaroqsiz qilinadi va `AuditLog`ga qayd etiladi.

---

## 5. Xodimlar Guruhini Sozlash

> [!CAUTION]
> **XAVFSIZLIK OGOHLANTIRISHI:**
> Xodimlar guruhiga tushadigan yangi buyurtma xabarlarida mijozning ismi, telefon raqami va aniq yetkazib berish manzili aks etadi. Shu sababli ushbu guruhga begona shaxslarni qo‘shish QAT’IYAN TAQIQLANADI! Guruhda faqat tekshirilgan va tasdiqlangan restoran xodimlari bo‘lishi shart.

1. Telegram’da xodimlar uchun yangi guruh yarating (masalan: `Tez-Taom Buyurtmalar`).
2. Yaratilgan xodimlar botini (`@tez_taom_uz_bot`) ushbu guruhga a’zo sifatida qo‘shing.
3. Loyiha egasi (`@fayzbek1331`) guruh ichida `/setgroup` buyrug‘ini yuboradi.
4. Bot buyruq yuboruvchi haqiqatan ham OWNER ekanini tekshiradi va ushbu guruh Chat ID sini bazaga (`Setting.staffChatId`) saqlab oladi.
5. Shundan so‘ng barcha yangi buyurtmalar avtomatik ushbu guruhga tushadi.

---

## 6. Ishga Tushirish Rejimlari

### 6.1. Lokal Rivojlanish (Polling Rejimi)
Lokal kompyuterda (HTTPS domen talab qilinmaydi):
```bash
npm run bots:dev
```
- Bu skript avval barcha eski webhooklarni tozalaydi;
- Long-polling (`getUpdates`) orqali buyruqlar va callback bosishlarni real-vaqtda qabul qiladi.

### 6.2. Ishlab Chiqarish (Production Webhook Rejimi)
Serverda HTTPS domeni (masalan `https://teztaom.uz`) mavjud bo‘lganda:
```bash
npm run bots:set-webhook
```
- Webhook xavfsiz `secret_token` bilan sozlanadi;
- Next.js API route: `POST /api/webhooks/telegram/staff` va `POST /api/webhooks/telegram/customer` so‘rovlarni qabul qiladi.
