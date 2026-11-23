# AGENTS.md — "Tez-Taom" Loyihasi Qoidalari va Ko‘rsatmalari

Ushbu hujjat "Tez-Taom" onlayn buyurtma platformasi ustida ishlovchi barcha agentlar va muhandislar uchun majburiy hisoblanadi. Keyingi barcha sessiyalarda ushbu qoidalarga qat’iy amal qilinishi shart.

---

## 1. Tillar (i18n) — Birinchi Kundan Asos

1. **Qo‘llab-quvvatlanadigan tillar va URL:**
   - `uz` — O‘zbekcha (Lotin, Asosiy til)
   - `uz-Cyrl` — Ўзбекча (Кирилл)
   - `ru` — Русский
   - `en` — English
   - Routing formati: `/[locale]/...` (masalan: `/uz`, `/uz-cyrl`, `/ru`, `/en`).
   - Birinchi kirishda `Accept-Language` headeri bo‘yicha til aniqlanadi, tanlov `NEXT_LOCALE` cookie’sida saqlanadi, headerda ixcham til almashtirgich bo‘ladi.

2. **Statik UI Matnlari:**
   - Barcha UI matnlari `messages/{locale}.json` fayllarida saqlanadi. Dastur kodida qotirilgan (hardcoded) matn bo‘lishi QAT’IYAN TAQIQLANADI.
   - ICU Plural formatidan foydalanilsin (ayniqsa rus tili uchun 3 ta shakl: `one`, `few`, `many`).
   - CI va testlarda barcha 4 tildagi kalitlar to‘liqligi (key parity) tekshirilishi shart.

3. **Dinamik Ma’lumotlar (Menyu va Kontent):**
   - Taom nomi, tavsifi, kategoriya, modifier nomlari bazada `LocalizedText` (Json: `{ uz, "uz-Cyrl"?, ru?, en? }`) sifatida saqlanadi.
   - Tarjima topilmasa yoki bo‘sh bo‘lsa, `getLocalized(text, locale)` har doim asosiy til `uz`ga fallback qilishi shart.
   - Admin formasida har til uchun tab va to‘ldirilganlik belgisi bo‘ladi.
   - "Lotin ➔ Kirill" tugmasi deterministik transliteratsiya moduli (`transliterateUzLatToCyrl`) orqali ishlaydi (unit-testlar bilan qoplangan).
   - "AI tarjima" tugmasi faqat qoralama (draft) beradi, admin saqlamaguncha bazaga yozilmaydi.

4. **Formatlash va Tipografika:**
   - Narxlar, sana va vaqt `Intl` API orqali formatlanadi:
     - `uz`: `32 000 so‘m`
     - `uz-Cyrl`: `32 000 сўм`
     - `ru`: `32 000 сум`
     - `en`: `UZS 32,000`
   - Telefon raqami barcha tillarda yagona formatda (`+998 XX XXX XX XX`).
   - Ruscha matnlar taxminan 30% uzunroq bo‘lganligi sababli, 360px ekranlarda ham interfeys buzilmasligi shart.
   - `Unbounded` va `Onest` shriftlarida `cyrillic` va `cyrillic-ext` subsetlari faol bo‘lishi, `Ў, Қ, Ғ, Ҳ` harflari to‘g‘ri chiqishi shart.

5. **SEO va Huquqiy Sahifalar:**
   - Har bir til uchun alohida URL, `hreflang`, `<html lang>`, tarjima qilingan metadata (title, description, OpenGraph).
   - Ommaviy oferta va Maxfiylik siyosati barcha 4 tilda namunaviy matn va "yurist ko‘rib chiqsin" belgisi bilan taqdim etiladi.

---

## 2. Dizayn Qoidalari

1. **Brend va Ohang:**
   - Brend nomi: **Tez-Taom**. Ohang: Tez, issiq, samimiy, aniq. Oddiy so‘zlar, jargonsiz.

2. **Ranglar Palitrasi:**
   - Asosiy (Primary): Ketchup qizil `#C92A1C`
   - Aksent (Accent): Xantal sariq `#FFC93C`
   - Matn rangi (Foreground): `#231815`
   - Fon (Background): Oq `#FFFFFF` va Och kulrang `#F5F2EF`
   - Dark mode qo‘llab-quvvatlanadi (qorong‘i fonda qizil aksent `#FF7262`).

3. **Tipografika (`next/font`):**
   - Sarlavhalar: `Unbounded` (font-weight: 600, 800)
   - Asosiy matn: `Onest` (font-weight: 400, 500, 700)

4. **Interfeys Elementlari:**
   - **Hero:** To‘liq kenglikdagi qizil blok, katta sarlavha ("Och qoldingmi? 25 daqiqada eshigingda."), qisqa jumla va xantal sariq rangli harakat tugmasi.
   - **Menyu:** Kartochkalar emas, menyu-taxta (menu board) kabi ixcham qatorlar. Chapda 64px plitka (rasm bo‘lmasa emoji), nomi, qisqa tavsifi, o‘ngda narx va "Qo‘shish" tugmasi.
   - **Savat va Chek:** Qog‘oz chek ko‘rinishida (och qog‘oz foni, punktir ajratgichlar, pastki qirrasi zigzag). Desktopda o‘ngda sticky, mobilda to‘liq ekranli modal yoki bottom-sheet.
   - **Checkout:** Yetkazish / Olib ketish segmentli tanlov.
   - **Oshxona ekrani (KDS):** Qorong‘i fon, yuqori kontrast, juda katta matn, audio signal.
   - **Admin paneli:** Zich (dense), jadval va kanban asoslangan, ortiqcha brend hero’siz.

5. **Taqiqlar:**
   - Gradient fonlar, bir xil soyali bir xil kartochkalar, maqsadsiz ortiqcha animatsiyalar TAQIQLANADI.
   - Animatsiyalar faqat foydalanuvchi harakatiga mikrojavob bo‘lishi va `prefers-reduced-motion` qoidalariga rioya qilishi shart.

---

## 3. Sifat va Xavfsizlik

1. **Moslashuvchanlik va Inklyuzivlik:**
   - 360px dan boshlab to‘liq moslashuvchan (responsive).
   - Klaviatura fokusi aniq ko‘rinishi, barcha interaktiv elementlarda to‘g‘ri `aria-label` bo‘lishi.
   - Kontrast darajasi WCAG AA talablariga to‘liq javob berishi.
   - Mobil Lighthouse natijalari barcha 4 tilda: **Performance ≥ 90**, **Accessibility ≥ 90**.

2. **Holatlar (States):**
   - Har bir ekranda va ro‘yxatda `loading`, `empty` (bo‘sh), va `error` (xatolik) holatlari bo‘lishi shart.
   - Xato xabarlari nima sodir bo‘lganini va foydalanuvchi nima qilishi kerakligini aniq tushuntirishi shart.

3. **Xavfsizlik va Autentifikatsiya:**
   - **Server-Side Pricing Authority:** Klientdan kelgan narxga ishonilmaydi. Server `POST /api/quote` va `POST /api/orders` da hamma narsani DB dan qayta hisoblaydi.
   - **Idempotency:** Har bir buyurtma so‘rovi mijozdan `idempotencyKey` talab qiladi va DB da unique saqlanadi.
   - **Rollar (RBAC):** `OWNER`, `ADMIN`, `OPERATOR`, `KITCHEN`, `COURIER`, `CUSTOMER`.
     - `OWNER` — yagona bosh egasi (Telegram: `@fayzbek1331`). Barcha huquqlar, tizim sozlamalari, guruh belgilash, xodimlarni taklif qilish/o‘chirish. ADMIN uni o‘zgartira yoki o‘chira olmaydi.
     - Avtorizatsiya faqat raqamli `telegramId` bo‘yicha amalga oshiriladi (username o‘zgaruvchan).
   - **Cookie xavfsizligi:** `httpOnly`, `secure`, `sameSite: "lax"`.
   - **Maxfiy ma’lumotlar:** Telefon raqamlari API javoblarida va server loglarida maskalanadi (`+998 90 *** ** 45`).
   - Hech qanday maxfiy kalit (secret) kodda saqlanmaydi, faqat `.env` orqali olinadi.
   - Buzuvchi buyruqlar (`prisma migrate reset`, DB tozalash, pullik xizmatlar) oldidan HAR DOIM foydalanuvchidan ruxsat so‘raladi.

---

## 4. Telegram Botlar Arxitekturasi

1. **Ikkita Bot — Alohida Token va Webhook:**
   - **Xodimlar boti (Staff Bot):** Xodimlar guruhiga buyurtmalarni chiqarish, inline tugmalar orqali holatni o‘zgartirish (`editMessageText`), xodimlar boshqaruvi, `/orders`, `/today`, `/open`, `/close`.
   - **Mijoz boti (Customer Bot):** Til tanlash, buyurtmani kuzatish (`ord_<orderId>`), Mini App va bildirishnomalar.

2. **Texnik Standartlar:**
   - Kod markazlashgan holda `src/server/telegram/` papkasida bo‘ladi (`client.ts`, `staffBot.ts`, `customerBot.ts`, `handlers.ts`, `keyboards.ts`).
   - Webhook endpointlari: `POST /api/webhooks/telegram/staff` va `/customer`. Har bir so‘rovda `X-Telegram-Bot-Api-Secret-Token` sarlavhasi tekshiriladi.
   - Rivojlanishda (local) `TELEGRAM_MODE=polling` (`npm run bots:dev`), ishlab chiqarishda (production) `TELEGRAM_MODE=webhook`.
   - `npm run bots:check` diagnostika buyrug‘i botlarning ulanishi, webhook holati va owner bog‘lanishini tekshiradi.
   - Xabarlarda foydalanuvchi ma’lumotlari (ism, manzil, izoh) qat’iy ravishda HTML escape qilinadi (`escapeHtml`).
   - `callback_data` 64 bayt bilan cheklanadi: `o:<orderId>:<action>`. Har bir bosishda xodimning `telegramId`si, roli va holat mashinasi ruxsatlari serverda tekshiriladi.
   - `answerCallbackQuery` har doim chaqiriladi.
