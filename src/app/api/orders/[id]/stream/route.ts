import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = params.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      let lastStatus: string | null = null;

      const sendEvent = (event: string, data: any) => {
        if (isClosed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch (err) {
          isClosed = true;
        }
      };

      // 1. Initial snapshot yuborish
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { status: true, number: true },
        });

        if (order) {
          lastStatus = order.status;
          sendEvent('status', { status: order.status, number: order.number });
        } else {
          sendEvent('error', { message: 'Buyurtma topilmadi' });
          controller.close();
          return;
        }
      } catch (err) {
        sendEvent('error', { message: 'Baza bilan aloqa uzildi' });
        controller.close();
        return;
      }

      // 2. Interval orqali o'zgarishlarni tekshirish (polling SSE)
      const interval = setInterval(async () => {
        if (isClosed) {
          clearInterval(interval);
          return;
        }

        try {
          const currentOrder = await prisma.order.findUnique({
            where: { id: orderId },
            select: { status: true },
          });

          if (!currentOrder) {
            clearInterval(interval);
            controller.close();
            return;
          }

          if (currentOrder.status !== lastStatus) {
            lastStatus = currentOrder.status;
            sendEvent('status', { status: currentOrder.status });
          } else {
            // Heartbeat yuborish
            sendEvent('ping', { time: Date.now() });
          }

          // Terminal holatlar bo'lsa streamni yopish
          if (
            currentOrder.status === 'DELIVERED' ||
            currentOrder.status === 'PICKED_UP' ||
            currentOrder.status === 'CANCELED'
          ) {
            clearInterval(interval);
            controller.close();
          }
        } catch (err) {
          clearInterval(interval);
          if (!isClosed) controller.close();
        }
      }, 2500);

      req.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
