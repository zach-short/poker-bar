'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { fetcher, markPlayerTabPaid, Player, Session, Order } from '@/lib/bar-api';

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: players = [] } = useSWR<Player[]>('/api/players', fetcher);
  const player = players.find((p) => p.id === id);

  const { data: sessions = [] } = useSWR<Session[]>('/api/sessions', fetcher);
  const { data: orders = [], mutate: mutateOrders } = useSWR<Order[]>(
    `/api/orders?playerId=${id}`,
    fetcher
  );

  const totalOutstanding = orders.filter((o) => !o.paid).reduce((s, o) => s + o.price, 0);
  const totalPaid = orders.filter((o) => o.paid).reduce((s, o) => s + o.price, 0);

  // Group orders by session, sorted newest first
  const sessionGroups = sessions
    .filter((s) => orders.some((o) => o.sessionId === s.id))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((session) => {
      const sessionOrders = orders
        .filter((o) => o.sessionId === session.id)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const unpaid = sessionOrders.filter((o) => !o.paid).reduce((s, o) => s + o.price, 0);
      const allPaid = sessionOrders.every((o) => o.paid);
      return { session, sessionOrders, unpaid, allPaid };
    });

  async function handleTogglePaid(session: Session, currentlyPaid: boolean) {
    const updated = orders.map((o) =>
      o.sessionId === session.id ? { ...o, paid: !currentlyPaid } : o
    );
    mutateOrders(updated, false);
    try {
      await markPlayerTabPaid(session.id, id, !currentlyPaid);
      mutateOrders();
    } catch (e) {
      mutateOrders();
      toast.error((e as Error).message);
    }
  }

  if (!player) {
    return (
      <div className='min-h-screen flex items-center justify-center text-muted-foreground text-sm tracking-widest'>
        Loading…
      </div>
    );
  }

  return (
    <main className='min-h-screen px-6 py-10 max-w-sm mx-auto pb-24'>
      <div className='flex items-center justify-between mb-10'>
        <div>
          <h1 className='text-base font-semibold tracking-widest uppercase text-primary'>{player.name}</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>{orders.length} total orders</p>
        </div>
        <button
          onClick={() => router.back()}
          className='text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors'
        >
          Back
        </button>
      </div>

      {/* Balance summary */}
      <div className='border border-border rounded-md p-4 mb-8 grid grid-cols-2 gap-4 text-center'>
        <div>
          <p className='text-xs text-muted-foreground mb-1'>Outstanding</p>
          <p className={`text-xl font-semibold ${totalOutstanding > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            ${totalOutstanding.toFixed(2)}
          </p>
        </div>
        <div>
          <p className='text-xs text-muted-foreground mb-1'>Paid to date</p>
          <p className='text-xl font-semibold text-green-500'>${totalPaid.toFixed(2)}</p>
        </div>
      </div>

      {sessionGroups.length === 0 && (
        <p className='text-center text-muted-foreground text-xs tracking-widest uppercase py-12'>No orders yet</p>
      )}

      {/* Per-session breakdown */}
      <div className='space-y-4'>
        {sessionGroups.map(({ session, sessionOrders, unpaid, allPaid }) => (
          <div key={session.id} className='border border-border rounded-md'>
            {/* Session header */}
            <div className='flex items-center justify-between px-4 py-3 border-b border-border'>
              <div>
                <p className='text-sm font-medium'>{session.name}</p>
                <p className='text-xs text-muted-foreground'>{formatDate(session.date)}</p>
              </div>
              <div className='flex items-center gap-2'>
                {!allPaid && (
                  <span className='text-sm font-semibold text-destructive tabular-nums'>
                    ${unpaid.toFixed(2)}
                  </span>
                )}
                <button
                  onClick={() => handleTogglePaid(session, allPaid)}
                  className={`text-[10px] tracking-widest uppercase px-2.5 py-1 rounded border transition-colors ${
                    allPaid
                      ? 'border-green-500/50 text-green-500 hover:border-green-500'
                      : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                  }`}
                >
                  {allPaid ? '✓ Paid' : 'Mark Paid'}
                </button>
              </div>
            </div>

            {/* Orders */}
            <div className='px-4 py-2 space-y-1'>
              {sessionOrders.map((order) => (
                <div key={order.id} className='flex items-center justify-between py-1 text-sm'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <span
                      className={`size-1.5 rounded-full shrink-0 ${order.paid ? 'bg-green-500' : 'bg-destructive'}`}
                    />
                    <span className={`truncate ${order.paid ? 'text-muted-foreground line-through' : ''}`}>
                      {order.drinkName}
                    </span>
                    <span className='text-xs text-muted-foreground shrink-0'>{formatTime(order.timestamp)}</span>
                  </div>
                  <span className={`tabular-nums shrink-0 ml-2 ${order.paid ? 'text-muted-foreground' : ''}`}>
                    ${order.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
