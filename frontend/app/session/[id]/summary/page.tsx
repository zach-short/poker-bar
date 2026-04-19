'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher, Session, Player, Order } from '@/lib/bar-api';
import { Button } from '@/components/ui/button';

export default function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: sessions = [] } = useSWR<Session[]>('/api/sessions', fetcher);
  const session = sessions.find((s) => s.id === id);

  const { data: players = [] } = useSWR<Player[]>('/api/players', fetcher);
  const { data: orders = [] } = useSWR<Order[]>(`/api/orders?sessionId=${id}`, fetcher);

  const sessionPlayers = players.filter((p) => session?.playerIds?.includes(p.id));

  const totalRevenue = orders.reduce((s, o) => s + o.price, 0);
  const totalCogs = orders.reduce((s, o) => s + o.costEstimate, 0);
  const totalProfit = totalRevenue - totalCogs;

  return (
    <main className='min-h-screen px-6 py-10 max-w-sm mx-auto pb-24'>
      <div className='mb-10'>
        <h1 className='text-base font-semibold tracking-widest uppercase text-primary mb-1'>Session Complete</h1>
        <p className='text-xs text-muted-foreground tracking-wide'>{session?.name}</p>
      </div>

      {/* Totals */}
      <div className='border border-border rounded-md p-5 mb-8'>
        <p className='text-xs tracking-widest uppercase text-muted-foreground mb-4'>Totals</p>
        <div className='grid grid-cols-3 gap-4 text-center'>
          <div>
            <p className='text-xs text-muted-foreground mb-1'>Revenue</p>
            <p className='text-xl font-semibold text-primary'>${totalRevenue.toFixed(2)}</p>
          </div>
          <div>
            <p className='text-xs text-muted-foreground mb-1'>Cost</p>
            <p className='text-xl font-semibold'>${totalCogs.toFixed(2)}</p>
          </div>
          <div>
            <p className='text-xs text-muted-foreground mb-1'>Profit</p>
            <p className={`text-xl font-semibold ${totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              ${totalProfit.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Per-player breakdown */}
      <div className='space-y-4'>
        {sessionPlayers.map((player) => {
          const playerOrders = orders.filter((o) => o.playerId === player.id);
          const subtotal = playerOrders.reduce((s, o) => s + o.price, 0);
          if (playerOrders.length === 0) return null;
          return (
            <div key={player.id} className='border border-border rounded-md'>
              <div className='flex items-center justify-between px-4 py-3 border-b border-border'>
                <span className='text-sm font-medium'>{player.name}</span>
                <span className='text-sm font-semibold text-primary'>${subtotal.toFixed(2)}</span>
              </div>
              <div className='px-4 py-2 space-y-1.5'>
                {playerOrders.map((order) => (
                  <div key={order.id} className='flex justify-between text-sm py-0.5'>
                    <span className='text-muted-foreground'>{order.drinkName}</span>
                    <span className='tabular-nums'>${order.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Button
        size='lg'
        className='w-full h-12 text-xs tracking-widest uppercase mt-8'
        onClick={() => router.push('/')}
      >
        Done
      </Button>
    </main>
  );
}
