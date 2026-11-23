import { PrismaClient, Role, OrderType, PaymentMethod, PaymentStatus, OrderStatus, PromoType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { transliterateUzLatToCyrl } from '../src/lib/i18n/transliterate';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Initial OWNER User (Telegram: @fayzbek1331)
  const ownerEmail = process.env.OWNER_EMAIL || 'owner@teztaom.uz';
  const ownerPassword = process.env.OWNER_PASSWORD || 'OwnerTezTaom2026!';
  const ownerPasswordHash = await bcrypt.hash(ownerPassword, 10);
  const ownerTelegramUsername = process.env.OWNER_TELEGRAM_USERNAME || 'fayzbek1331';

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { passwordHash: ownerPasswordHash, role: Role.OWNER, telegramUsername: ownerTelegramUsername },
    create: {
      name: 'Loyiha Egasi (Owner)',
      email: ownerEmail,
      phone: '+998901234567',
      passwordHash: ownerPasswordHash,
      role: Role.OWNER,
      telegramUsername: ownerTelegramUsername,
      locale: 'uz',
    },
  });
  console.log(`✅ Owner user seeded: ${owner.email} (@${ownerTelegramUsername})`);

  // 1.1 Initial Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@teztaom.uz';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminTezTaom2026!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: Role.ADMIN },
    create: {
      name: 'Bosh Administrator',
      email: adminEmail,
      phone: '+998901234568',
      passwordHash,
      role: Role.ADMIN,
      locale: 'uz',
    },
  });
  console.log(`✅ Admin user seeded: ${admin.email}`);

  // 2. Central Branch
  const branch = await prisma.branch.upsert({
    where: { id: 'branch-central' },
    update: {},
    create: {
      id: 'branch-central',
      name: {
        uz: 'Markaziy filial (Amir Temur)',
        'uz-Cyrl': 'Марказий филиал (Амир Темур)',
        ru: 'Центральный филиал (Амир Темур)',
        en: 'Central Branch (Amir Temur)',
      },
      address: {
        uz: 'Toshkent sh., Amir Temur shoh ko‘chasi, 1-uy',
        'uz-Cyrl': 'Тошкент ш., Амир Темур шоҳ кўчаси, 1-уй',
        ru: 'г. Ташкент, проспект Амира Темура, 1',
        en: '1, Amir Temur Ave, Tashkent',
      },
      lat: 41.311158,
      lng: 69.279737,
      phone: '+998 71 200 00 00',
      hours: { open: '09:00', close: '23:00' },
      isActive: true,
    },
  });
  console.log(`✅ Branch seeded: ${branch.id}`);

  // 3. Delivery Zones (Prepared for Phase 3)
  const zonesData = [
    { id: 'zone-1', name: '0–3 km (Yashil zona)', fee: 10000, minOrder: 0, etaMinutes: 25 },
    { id: 'zone-2', name: '3–7 km (Sariq zona)', fee: 15000, minOrder: 50000, etaMinutes: 35 },
    { id: 'zone-3', name: '7–12 km (Qizil zona)', fee: 25000, minOrder: 80000, etaMinutes: 50 },
  ];

  for (const z of zonesData) {
    await prisma.deliveryZone.upsert({
      where: { id: z.id },
      update: z,
      create: { ...z, branchId: branch.id },
    });
  }
  console.log('✅ Delivery zones seeded');

  // 4. Settings
  await prisma.setting.upsert({
    where: { key: 'delivery_settings' },
    update: {
      value: { defaultDeliveryFee: 15000, freeDeliveryThreshold: 100000 },
    },
    create: {
      key: 'delivery_settings',
      value: { defaultDeliveryFee: 15000, freeDeliveryThreshold: 100000 },
    },
  });

  await prisma.setting.upsert({
    where: { key: 'restaurant_settings' },
    update: {
      value: { maxHourlyOrders: 50, isOpen: true },
    },
    create: {
      key: 'restaurant_settings',
      value: { maxHourlyOrders: 50, isOpen: true },
    },
  });
  console.log('✅ Settings seeded');

  // 5. Promo Code
  await prisma.promo.upsert({
    where: { code: 'XUSH2026' },
    update: {},
    create: {
      code: 'XUSH2026',
      type: PromoType.PERCENT,
      value: 10,
      minOrder: 50000,
      startsAt: new Date('2026-01-01'),
      endsAt: new Date('2026-12-31'),
      usageLimit: 500,
      usedCount: 0,
      isActive: true,
    },
  });
  console.log('✅ Promo code seeded');

  // 6. Categories & Menu Items
  const categories = [
    {
      id: 'cat-kombo',
      slug: 'kombolar',
      sort: 1,
      name: {
        uz: 'Kombolar',
        'uz-Cyrl': 'Комболар',
        ru: 'Комбо наборы',
        en: 'Combo Meals',
      },
      items: [
        {
          id: 'item-klassik-kombo',
          price: 49000,
          emoji: '🍔',
          tags: ['popular'],
          allergens: ['Gluten', 'Sut'],
          sort: 1,
          name: {
            uz: 'Klassik kombo',
            'uz-Cyrl': transliterateUzLatToCyrl('Klassik kombo'),
            ru: 'Классик комбо',
            en: 'Classic Combo',
          },
          description: {
            uz: 'Klassik burger, kartoshka fri va muzdek kola 0,5 l',
            'uz-Cyrl': transliterateUzLatToCyrl('Klassik burger, kartoshka fri va muzdek kola 0,5 l'),
            ru: 'Классический бургер, картофель фри и прохладная кола 0,5 л',
            en: 'Classic burger, French fries and chilled Coke 0.5L',
          },
        },
        {
          id: 'item-lavash-kombo',
          price: 47000,
          emoji: '🌯',
          tags: ['popular'],
          allergens: ['Gluten'],
          sort: 2,
          name: {
            uz: 'Lavash kombo',
            'uz-Cyrl': transliterateUzLatToCyrl('Lavash kombo'),
            ru: 'Лаваш комбо',
            en: 'Lavash Combo',
          },
          description: {
            uz: 'Mol go‘shtli lavash, kartoshka fri va xonaki limonad',
            'uz-Cyrl': transliterateUzLatToCyrl('Mol go‘shtli lavash, kartoshka fri va xonaki limonad'),
            ru: 'Лаваш с говядиной, картофель фри и домашний лимонад',
            en: 'Beef lavash wrap, French fries and homemade lemonade',
          },
        },
      ],
    },
    {
      id: 'cat-burger',
      slug: 'burgerlar',
      sort: 2,
      name: {
        uz: 'Burgerlar',
        'uz-Cyrl': 'Бургерлар',
        ru: 'Бургеры',
        en: 'Burgers',
      },
      items: [
        {
          id: 'item-klassik-burger',
          price: 32000,
          emoji: '🍔',
          tags: ['popular'],
          allergens: ['Gluten', 'Sut', 'Kunjut'],
          sort: 1,
          name: {
            uz: 'Klassik burger',
            'uz-Cyrl': transliterateUzLatToCyrl('Klassik burger'),
            ru: 'Классический бургер',
            en: 'Classic Burger',
          },
          description: {
            uz: 'Yumshoq bulochka, 100% mol go‘shti kotleti, yangi pomidor va maxsus sous',
            'uz-Cyrl': transliterateUzLatToCyrl('Yumshoq bulochka, 100% mol go‘shti kotleti, yangi pomidor va maxsus sous'),
            ru: 'Нежная булочка, 100% говяжья котлета, свежие томаты и фирменный соус',
            en: 'Soft bun, 100% beef patty, fresh tomatoes and signature sauce',
          },
          modifiers: [
            {
              id: 'mod-burger-cheese',
              name: { uz: 'Qo‘shimcha pishloq', 'uz-Cyrl': 'Қўшимча пишлоқ', ru: 'Дополнительный сыр', en: 'Extra cheese' },
              required: false,
              min: 0,
              max: 2,
              options: [
                { id: 'opt-cheese', name: { uz: 'Pishloq', 'uz-Cyrl': 'Пишлоқ', ru: 'Сыр Чеддер', en: 'Cheddar cheese' }, priceDelta: 4000 },
              ],
            },
            {
              id: 'mod-burger-sauce',
              name: { uz: 'Sous tanlash', 'uz-Cyrl': 'Соус танлаш', ru: 'Выбор соуса', en: 'Choose sauce' },
              required: false,
              min: 0,
              max: 3,
              options: [
                { id: 'opt-ketchup', name: { uz: 'Ketchup', 'uz-Cyrl': 'Кетчуп', ru: 'Кетчуп', en: 'Ketchup' }, priceDelta: 0 },
                { id: 'opt-cheese-sauce', name: { uz: 'Pishloqli sous', 'uz-Cyrl': 'Пишлоқли соус', ru: 'Сырный соус', en: 'Cheese sauce' }, priceDelta: 3000 },
                { id: 'opt-spicy-sauce', name: { uz: 'Achchiq sous', 'uz-Cyrl': 'Аччиқ соус', ru: 'Острый соус', en: 'Spicy sauce' }, priceDelta: 3000 },
              ],
            },
            {
              id: 'mod-burger-onion',
              name: { uz: 'Piyoz', 'uz-Cyrl': 'Пиёз', ru: 'Лук', en: 'Onion' },
              required: false,
              min: 0,
              max: 1,
              options: [
                { id: 'opt-no-onion', name: { uz: 'Piyozsiz', 'uz-Cyrl': 'Пиёзсиз', ru: 'Без лука', en: 'No onion' }, priceDelta: 0 },
              ],
            },
          ],
        },
        {
          id: 'item-double-burger',
          price: 46000,
          emoji: '🍔',
          tags: ['popular'],
          allergens: ['Gluten', 'Sut'],
          sort: 2,
          name: {
            uz: 'Double burger',
            'uz-Cyrl': transliterateUzLatToCyrl('Double burger'),
            ru: 'Двойной бургер',
            en: 'Double Burger',
          },
          description: {
            uz: 'Ikki barobar mol go‘shti kotleti, ikki qavat eritilgan pishloq',
            'uz-Cyrl': transliterateUzLatToCyrl('Ikki barobar mol go‘shti kotleti, ikki qavat eritilgan pishloq'),
            ru: 'Двойная говяжья котлета, двойной слой тающего сыра Чеддер',
            en: 'Double beef patty, double melted Cheddar cheese',
          },
        },
        {
          id: 'item-chicken-burger',
          price: 30000,
          emoji: '🐔',
          tags: ['new'],
          allergens: ['Gluten'],
          sort: 3,
          name: {
            uz: 'Chiken burger',
            'uz-Cyrl': transliterateUzLatToCyrl('Chiken burger'),
            ru: 'Чикен бургер',
            en: 'Chicken Burger',
          },
          description: {
            uz: 'Qarsildoq tovuq filesi, aysberg salati va mayonezli sous',
            'uz-Cyrl': transliterateUzLatToCyrl('Qarsildoq tovuq filesi, aysberg salati va mayonezli sous'),
            ru: 'Хрустящее куриное филе, салат айсберг и нежный соус',
            en: 'Crispy chicken fillet, iceberg lettuce and creamy sauce',
          },
        },
      ],
    },
    {
      id: 'cat-lavash',
      slug: 'lavash',
      sort: 3,
      name: {
        uz: 'Lavash',
        'uz-Cyrl': 'Лаваш',
        ru: 'Лаваш',
        en: 'Lavash Wraps',
      },
      items: [
        {
          id: 'item-beef-lavash',
          price: 30000,
          emoji: '🌯',
          tags: ['popular'],
          allergens: ['Gluten'],
          sort: 1,
          name: {
            uz: 'Mol go‘shtli lavash',
            'uz-Cyrl': transliterateUzLatToCyrl('Mol go‘shtli lavash'),
            ru: 'Лаваш с говядиной',
            en: 'Beef Lavash',
          },
          description: {
            uz: 'Yupqa xamirda marinadlangan mol go‘shti, chipslar, bodring va pomidor',
            'uz-Cyrl': transliterateUzLatToCyrl('Yupqa xamirda marinadlangan mol go‘shti, chipslar, bodring va pomidor'),
            ru: 'Маринованная говядина в тонком лаваше, чипсы, огурцы и помидоры',
            en: 'Marinated beef in thin flatbread, potato chips, cucumber and tomatoes',
          },
        },
        {
          id: 'item-chicken-lavash',
          price: 28000,
          emoji: '🌯',
          allergens: ['Gluten'],
          sort: 2,
          name: {
            uz: 'Tovuqli lavash',
            'uz-Cyrl': transliterateUzLatToCyrl('Tovuqli lavash'),
            ru: 'Лаваш с курицей',
            en: 'Chicken Lavash',
          },
          description: {
            uz: 'Shirali tovuq go‘shti, yangi sabzavotlar va maxsus oq sous',
            'uz-Cyrl': transliterateUzLatToCyrl('Shirali tovuq go‘shti, yangi sabzavotlar va maxsus oq sous'),
            ru: 'Сочное куриное филе, свежие овощи и фирменный белый соус',
            en: 'Juicy chicken fillet, fresh vegetables and signature white sauce',
          },
        },
      ],
    },
    {
      id: 'cat-gazaklar',
      slug: 'gazaklar',
      sort: 4,
      name: {
        uz: 'Gazaklar',
        'uz-Cyrl': 'Газаклар',
        ru: 'Закуски',
        en: 'Snacks',
      },
      items: [
        {
          id: 'item-fries',
          price: 14000,
          emoji: '🍟',
          tags: ['popular'],
          sort: 1,
          name: {
            uz: 'Kartoshka fri',
            'uz-Cyrl': transliterateUzLatToCyrl('Kartoshka fri'),
            ru: 'Картофель фри',
            en: 'French Fries',
          },
          description: {
            uz: 'Tilla rangda qovurilgan, qarsildoq kartoshka fri',
            'uz-Cyrl': transliterateUzLatToCyrl('Tilla rangda qovurilgan, qarsildoq kartoshka fri'),
            ru: 'Золотистый, хрустящий картофель фри со щепоткой соли',
            en: 'Golden crispy French fries lightly salted',
          },
          modifiers: [
            {
              id: 'mod-fries-size',
              name: { uz: 'O‘lcham', 'uz-Cyrl': 'Ўлчам', ru: 'Размер', en: 'Size' },
              required: true,
              min: 1,
              max: 1,
              options: [
                { id: 'opt-fries-regular', name: { uz: 'Oddiy', 'uz-Cyrl': 'Оддий', ru: 'Стандартный', en: 'Regular' }, priceDelta: 0 },
                { id: 'opt-fries-large', name: { uz: 'Katta', 'uz-Cyrl': 'Катта', ru: 'Большой (+5 000)', en: 'Large (+5 000)' }, priceDelta: 5000 },
              ],
            },
          ],
        },
        {
          id: 'item-nuggets',
          price: 24000,
          emoji: '🍗',
          tags: ['popular'],
          allergens: ['Gluten'],
          sort: 2,
          name: {
            uz: 'Tovuq nagetslari (9 dona)',
            'uz-Cyrl': transliterateUzLatToCyrl('Tovuq nagetslari (9 dona)'),
            ru: 'Куриные наггетсы (9 шт)',
            en: 'Chicken Nuggets (9 pcs)',
          },
          description: {
            uz: 'Qarsildoq non uvog‘ida pishirilgan yumshoq tovuq go‘shti',
            'uz-Cyrl': transliterateUzLatToCyrl('Qarsildoq non uvog‘ida pishirilgan yumshoq tovuq go‘shti'),
            ru: 'Нежное куриное филе в хрустящей панировке',
            en: 'Tender chicken fillet in crunchy breadcrumbs',
          },
        },
      ],
    },
    {
      id: 'cat-ichimliklar',
      slug: 'ichimliklar',
      sort: 5,
      name: {
        uz: 'Ichimliklar',
        'uz-Cyrl': 'Ичимликлар',
        ru: 'Напитки',
        en: 'Beverages',
      },
      items: [
        {
          id: 'item-cola',
          price: 9000,
          emoji: '🥤',
          sort: 1,
          name: {
            uz: 'Kola 0,5 l',
            'uz-Cyrl': transliterateUzLatToCyrl('Kola 0,5 l'),
            ru: 'Кола 0,5 л',
            en: 'Coca-Cola 0.5L',
          },
          description: {
            uz: 'Klassik tetiklashtiruvchi gazlangan ichimlik',
            'uz-Cyrl': transliterateUzLatToCyrl('Klassik tetiklashtiruvchi gazlangan ichimlik'),
            ru: 'Классический освежающий газированный напиток',
            en: 'Classic refreshing carbonated beverage',
          },
          modifiers: [
            {
              id: 'mod-drink-ice',
              name: { uz: 'Muz', 'uz-Cyrl': 'Муз', ru: 'Лед', en: 'Ice' },
              required: false,
              min: 0,
              max: 1,
              options: [
                { id: 'opt-with-ice', name: { uz: 'Muz bilan', 'uz-Cyrl': 'Муз билан', ru: 'Со льдом', en: 'With ice' }, priceDelta: 0 },
                { id: 'opt-no-ice', name: { uz: 'Muzsiz', 'uz-Cyrl': 'Музсиз', ru: 'Без льда', en: 'No ice' }, priceDelta: 0 },
              ],
            },
          ],
        },
        {
          id: 'item-lemonade',
          price: 14000,
          emoji: '🍋',
          sort: 2,
          name: {
            uz: 'Uy limonadi',
            'uz-Cyrl': transliterateUzLatToCyrl('Uy limonadi'),
            ru: 'Домашний лимонад',
            en: 'Homemade Lemonade',
          },
          description: {
            uz: 'Yangi siqilgan limon sharbati va yalpiz barglari bilan',
            'uz-Cyrl': transliterateUzLatToCyrl('Yangi siqilgan limon sharbati va yalpiz barglari bilan'),
            ru: 'Со свежевыжатым соком лимона и ароматной мятой',
            en: 'Fresh squeezed lemon juice with mint leaves',
          },
        },
        {
          id: 'item-ayron',
          price: 8000,
          emoji: '🥛',
          allergens: ['Sut'],
          sort: 3,
          name: {
            uz: 'Ayron',
            'uz-Cyrl': transliterateUzLatToCyrl('Ayron'),
            ru: 'Айран',
            en: 'Ayran',
          },
          description: {
            uz: 'An’anaviy, xushxo‘r sutli yaxna ichimlik',
            'uz-Cyrl': transliterateUzLatToCyrl('An’anaviy, xushxo‘r sutli yaxna ichimlik'),
            ru: 'Традиционный прохладный кисломолочный напиток',
            en: 'Traditional chilled savory yogurt drink',
          },
        },
      ],
    },
    {
      id: 'cat-shirinliklar',
      slug: 'shirinliklar',
      sort: 6,
      name: {
        uz: 'Shirinliklar',
        'uz-Cyrl': 'Ширинликлар',
        ru: 'Десерты',
        en: 'Desserts',
      },
      items: [
        {
          id: 'item-ice-cream',
          price: 12000,
          emoji: '🍦',
          allergens: ['Sut'],
          sort: 1,
          name: {
            uz: 'Muzqaymoq',
            'uz-Cyrl': transliterateUzLatToCyrl('Muzqaymoq'),
            ru: 'Мороженое пломбир',
            en: 'Ice Cream',
          },
          description: {
            uz: 'Krem-bryule ta’mli tabiiy qaymoqli muzqaymoq',
            'uz-Cyrl': transliterateUzLatToCyrl('Krem-bryule ta’mli tabiiy qaymoqli muzqaymoq'),
            ru: 'Натуральное сливочное мороженое с нежным вкусом',
            en: 'Natural creamy vanilla ice cream',
          },
        },
        {
          id: 'item-brownie',
          price: 16000,
          emoji: '🍫',
          allergens: ['Gluten', 'Sut', 'Tuxum'],
          sort: 2,
          name: {
            uz: 'Shokoladli brauni',
            'uz-Cyrl': transliterateUzLatToCyrl('Shokoladli brauni'),
            ru: 'Шоколадный брауни',
            en: 'Chocolate Brownie',
          },
          description: {
            uz: 'Qora shokoladli, issiq va mayin pirojnoe',
            'uz-Cyrl': transliterateUzLatToCyrl('Qora shokoladli, issiq va mayin pirojnoe'),
            ru: 'Теплый шоколадный десерт из темного бельгийского шоколада',
            en: 'Warm chocolate pastry made with dark Belgian chocolate',
          },
        },
      ],
    },
  ];

  for (const cat of categories) {
    const createdCat = await prisma.category.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        slug: cat.slug,
        sort: cat.sort,
        isActive: true,
      },
      create: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        sort: cat.sort,
        isActive: true,
      },
    });

    for (const item of cat.items) {
      const createdItem = await prisma.menuItem.upsert({
        where: { id: item.id },
        update: {
          name: item.name,
          description: item.description,
          price: item.price,
          emoji: item.emoji,
          tags: (item as any).tags || [],
          allergens: (item as any).allergens || [],
          sort: item.sort,
          isActive: true,
        },
        create: {
          id: item.id,
          categoryId: createdCat.id,
          name: item.name,
          description: item.description,
          price: item.price,
          emoji: item.emoji,
          tags: (item as any).tags || [],
          allergens: (item as any).allergens || [],
          sort: item.sort,
          isActive: true,
        },
      });

      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          const createdGroup = await prisma.modifierGroup.upsert({
            where: { id: mod.id },
            update: {
              name: mod.name,
              required: mod.required,
              min: mod.min,
              max: mod.max,
            },
            create: {
              id: mod.id,
              menuItemId: createdItem.id,
              name: mod.name,
              required: mod.required,
              min: mod.min,
              max: mod.max,
            },
          });

          for (const opt of mod.options) {
            await prisma.modifierOption.upsert({
              where: { id: opt.id },
              update: {
                name: opt.name,
                priceDelta: opt.priceDelta,
                isActive: true,
              },
              create: {
                id: opt.id,
                groupId: createdGroup.id,
                name: opt.name,
                priceDelta: opt.priceDelta,
                isActive: true,
              },
            });
          }
        }
      }
    }
  }

  console.log('✅ Categories, menu items and modifiers seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
