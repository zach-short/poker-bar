'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher, computeBalance, Player, Order, BuyIn, Cashout, Payment } from '@/lib/bar-api';

export default function PlayersPage() {
  const router = useRouter();
  const { data: players = [], isLoading } = useSWR<Player[]>('/api/players', fetcher);
  const { data: orders = [] } = useSWR<Order[]>('/api/orders', fetcher);
  const { data: buyIns = [] } = useSWR<BuyIn[]>('/api/buyins', fetcher);
  const { data: cashouts = [] } = useSWR<Cashout[]>('/api/cashouts', fetcher);
  const { data: payments = [] } = useSWR<Payment[]>('/api/payments', fetcher);

  const playerRows = players
    .map((player) => ({
      player,
      balance: computeBalance(player.id, orders, buyIns, cashouts, payments),
    }))
    .sort((a, b) => b.balance - a.balance);

  const totalOwed = playerRows.filter((r) => r.balance > 0).reduce((s, r) => s + r.balance, 0);

  return (
    <main className='min-h-screen px-6 py-10 max-w-sm mx-auto'>
      <div className='flex items-center justify-between mb-10'>
        <div>
          <h1 className='text-base font-semibold tracking-widest uppercase text-primary'>Players</h1>
          {totalOwed > 0 && (
            <p className='text-xs text-muted-foreground mt-0.5'>${totalOwed.toFixed(2)} outstanding</p>
          )}
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
        {playerRows.map(({ player, balance }) => (
          <button
            key={player.id}
            onClick={() => router.push(`/players/${player.id}`)}
            className='w-full text-left border border-border rounded-md px-4 py-4 hover:border-primary/50 transition-colors'
          >
            <div className='flex items-center justify-between gap-3'>
              <span className='text-sm font-medium'>{player.name}</span>
              <div className='flex items-center gap-2 shrink-0'>
                {Math.abs(balance) < 0.01 ? (
                  <span className='text-xs tracking-widest uppercase text-muted-foreground'>Even</span>
                ) : balance > 0 ? (
                  <span className='text-sm font-semibold text-destructive tabular-nums'>${balance.toFixed(2)} owes you</span>
                ) : (
                  <span className='text-sm font-semibold text-green-500 tabular-nums'>You owe ${Math.abs(balance).toFixed(2)}</span>
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
