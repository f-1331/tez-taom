import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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

    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    console.error('Error fetching menu:', error);
    return NextResponse.json(
      { success: false, error: 'Menyuni yuklashda xatolik yuz berdi' },
      { status: 500 }
    );
  }
}
