import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { maskPhone } from '@/lib/telegram/staff-notifier';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        events: {
          orderBy: { createdAt: 'asc' },
        },
        courier: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Buyurtma topilmadi' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        number: order.number,
        type: order.type,
        status: order.status,
        customerName: order.customerName,
        phone: maskPhone(order.phone),
        addressText: order.addressText,
        comment: order.comment,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        discount: order.discount,
        total: order.total,
        createdAt: order.createdAt,
        items: order.items,
        events: order.events,
        courier: order.courier
          ? {
              name: order.courier.name,
              phone: maskPhone(order.courier.phone),
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { success: false, error: 'Buyurtma ma’lumotlarini yuklashda xatolik' },
      { status: 500 }
    );
  }
}
