'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher, Player, Order } from '@/lib/bar-api';

export default function PlayersPage() {
  const router = useRouter();
  const { data: players = [], isLoading } = useSWR<Player[]>('/api/players', fetcher);
  const { data: orders = [] } = useSWR<Order[]>('/api/orders', fetcher);

  const playerStats = players.map((player) => {
    const playerOrders = orders.filter((o) => o.playerId === player.id);
    const outstanding = playerOrders.filter((o) => !o.paid).reduce((s, o) => s + o.price, 0);
    return { player, outstanding };
  });

  const sorted = [...playerStats].sort((a, b) => b.outstanding - a.outstanding);

  return (
    <main className='min-h-screen px-6 py-10 max-w-sm mx-auto'>
      <div className='flex items-center justify-between mb-10'>
        <div>
          <h1 className='text-base font-semibold tracking-widest uppercase text-primary'>Players</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>{players.length} total</p>
        </div>
        <button
          onClick={() => router.back()}
          className='text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors'
        >
          Back
        </button>
      </div>

      {isLoading && (
        <p className='text-center text-muted-foreground text-xs tracking-widest uppercase py-12'>Loading…</p>
      )}

      {!isLoading && players.length === 0 && (
        <p className='text-center text-muted-foreground text-xs tracking-widest uppercase py-12'>No players yet</p>
      )}

      <div className='space-y-2'>
        {sorted.map(({ player, outstanding }) => (
          <button
            key={player.id}
            onClick={() => router.push(`/players/${player.id}`)}
            className='w-full text-left border border-border rounded-md px-4 py-4 hover:border-primary/50 transition-colors'
          >
            <div className='flex items-center justify-between gap-3'>
              <span className='text-sm font-medium'>{player.name}</span>
              <div className='flex items-center gap-2 shrink-0'>
                {outstanding > 0 ? (
                  <span className='text-sm font-semibold text-destructive tabular-nums'>
                    ${outstanding.toFixed(2)} owed
                  </span>
                ) : (
                  <span className='text-xs tracking-widest uppercase text-green-500'>All paid</span>
                )}
                <span className='text-primary text-xs'>›</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
