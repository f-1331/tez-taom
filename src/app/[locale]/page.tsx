import React from 'react';
import { prisma } from '@/lib/prisma';
import Hero from '@/components/Hero';
import MenuSection from '@/components/MenuSection';

export const dynamic = 'force-dynamic';

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sort: 'asc' },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { sort: 'asc' },
        include: {
          modifiers: {
            orderBy: { sort: 'asc' },
            include: {
              options: {
                where: { isActive: true },
                orderBy: { sort: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <Hero locale={locale} />
      <MenuSection categories={categories} locale={locale} />
    </div>
  );
}
