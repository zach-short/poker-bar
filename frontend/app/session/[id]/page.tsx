'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  fetcher, apiFetch, markPlayerTabPaid,
  Session, Player, Order, DrinkRecipe, InventoryItem, CreateOrderResponse,
  BuyIn, Cashout,
} from '@/lib/bar-api';
import { DrinkPickerModal } from '@/components/DrinkPickerModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatElapsed(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: session } = useSWR<Session>(`/api/sessions?id=${id}`, async () => {
    const sessions = await fetcher<Session[]>('/api/sessions');
    return sessions.find((s) => s.id === id)!;
  });
  const { data: players = [] } = useSWR<Player[]>('/api/players', fetcher);
  const { data: orders = [], mutate: mutateOrders } = useSWR<Order[]>(
    `/api/orders?sessionId=${id}`, fetcher, { refreshInterval: 15000 }
  );
  const { data: buyIns = [], mutate: mutateBuyIns } = useSWR<BuyIn[]>(
    `/api/buyins?sessionId=${id}`, fetcher
  );
  const { data: drinks = [] } = useSWR<DrinkRecipe[]>('/api/drinks', fetcher);
  const { data: inventory = [], mutate: mutateInventory } = useSWR<InventoryItem[]>('/api/inventory', fetcher);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [elapsed, setElapsed] = useState('0m');

  // Re-buy state
  const [rebuyPlayerId, setRebuyPlayerId] = useState<string | null>(null);
  const [rebuyAmount, setRebuyAmount] = useState('');
  const [rebuying, setRebuying] = useState(false);

  // Cashout step state
  const [showCashout, setShowCashout] = useState(false);
  const [cashoutAmounts, setCashoutAmounts] = useState<Record<string, string>>({});
  const [closingSession, setClosingSession] = useState(false);

  useEffect(() => {
    if (!session) return;
    const tick = () => setElapsed(formatElapsed(session.date));
    tick();
    const iv = setInterval(tick, 60000);
    return () => clearInterval(iv);
  }, [session]);

  useEffect(() => {
    if (!selectedPlayerId && session?.playerIds?.length) {
      setSelectedPlayerId(session.playerIds[0]);
    }
  }, [session, selectedPlayerId]);

  const sessionPlayers = players.filter((p) => session?.playerIds?.includes(p.id));

  const tabTotal = useCallback(
    (playerId: string) => orders.filter((o) => o.playerId === playerId).reduce((s, o) => s + o.price, 0),
    [orders]
  );

  const buyInTotal = useCallback(
    (playerId: string) => buyIns.filter((b) => b.playerId === playerId).reduce((s, b) => s + b.amount, 0),
    [buyIns]
  );

  const isTabPaid = useCallback(
    (playerId: string) => {
      const playerOrders = orders.filter((o) => o.playerId === playerId);
      return playerOrders.length > 0 && playerOrders.every((o) => o.paid);
    },
    [orders]
  );

  async function handleMarkPaid(playerId: string) {
    const alreadyPaid = isTabPaid(playerId);
    mutateOrders(orders.map((o) => o.playerId === playerId ? { ...o, paid: !alreadyPaid } : o), false);
    try {
      await markPlayerTabPaid(id, playerId, !alreadyPaid);
      mutateOrders();
    } catch (e) {
      mutateOrders();
      toast.error((e as Error).message);
    }
  }

  async function handleRebuy(playerId: string) {
    const amount = parseFloat(rebuyAmount);
    if (!amount || amount <= 0) return;
    setRebuying(true);
    try {
      await apiFetch<BuyIn>('/api/buyins', {
        method: 'POST',
        body: JSON.stringify({ sessionId: id, playerId, amount }),
      });
      toast.success(`Re-buy $${amount.toFixed(2)} added`);
      mutateBuyIns();
      setRebuyPlayerId(null);
      setRebuyAmount('');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRebuying(false);
    }
  }

  async function handleCloseSession() {
    setClosingSession(true);
    try {
      await Promise.all(
        sessionPlayers.map((p) => {
          const amount = parseFloat(cashoutAmounts[p.id] ?? '0') || 0;
          if (amount > 0) {
            return apiFetch<Cashout>('/api/cashouts', {
              method: 'POST',
              body: JSON.stringify({ sessionId: id, playerId: p.id, amount }),
            });
          }
        })
      );
      await apiFetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'closed' }),
      });
      router.push(`/session/${id}/summary`);
    } catch (e) {
      toast.error((e as Error).message);
      setClosingSession(false);
    }
  }

  const selectedOrders = orders
    .filter((o) => o.playerId === selectedPlayerId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  async function handleDrinkSelect(drink: DrinkRecipe) {
    if (!selectedPlayerId) return;
    setShowPicker(false);
    const tempId = `temp-${Date.now()}`;
    const optimistic: Order = {
      id: tempId, sessionId: id, playerId: selectedPlayerId,
      drinkId: drink.id, drinkName: drink.name, price: drink.price,
      costEstimate: drink.costEstimate, timestamp: new Date().toISOString(), paid: false,
    };
    mutateOrders([optimistic, ...orders], false);
    try {
      const res = await apiFetch<CreateOrderResponse>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ sessionId: id, playerId: selectedPlayerId, drinkId: drink.id }),
      });
      toast.success(`${drink.name} added`);
      if (res.lowStockWarnings?.length) {
        res.lowStockWarnings.forEach((n) => toast.warning(`Low stock: ${n}`));
      }
      mutateOrders();
      mutateInventory();
    } catch (e) {
      mutateOrders(orders.filter((o) => o.id !== tempId), false);
      toast.error((e as Error).message);
    }
  }

  async function handleUndo(order: Order) {
    mutateOrders(orders.filter((o) => o.id !== order.id), false);
    try {
      await apiFetch(`/api/orders/${order.id}`, { method: 'DELETE' });
      toast.success('Order removed');
      mutateOrders();
      mutateInventory();
    } catch (e) {
      mutateOrders();
      toast.error((e as Error).message);
    }
  }

  if (!session) {
    return <div className='min-h-screen flex items-center justify-center text-muted-foreground text-sm tracking-widest'>Loading…</div>;
  }

  // ── Cashout step ─────────────────────────────────────────────────────────────
  if (showCashout) {
    return (
      <main className='min-h-screen flex flex-col max-w-lg mx-auto px-6 py-10'>
        <div className='mb-8'>
          <h1 className='text-base font-semibold tracking-widest uppercase text-primary mb-1'>Cash Out</h1>
          <p className='text-xs text-muted-foreground'>Enter each player&apos;s chip value to close the session.</p>
        </div>

        <div className='space-y-4 flex-1'>
          {sessionPlayers.map((player) => {
            const drinks = tabTotal(player.id);
            const buys = buyInTotal(player.id);
            return (
              <div key={player.id} className='border border-border rounded-md px-4 py-4'>
                <div className='flex items-center justify-between mb-3'>
                  <span className='text-sm font-medium'>{player.name}</span>
                  <div className='text-right text-xs text-muted-foreground'>
                    <span>Bought in ${buys.toFixed(2)}</span>
                    {drinks > 0 && <span> · Drinks ${drinks.toFixed(2)}</span>}
                  </div>
                </div>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm'>$</span>
                  <Input
                    type='number'
                    min='0'
                    step='1'
                    placeholder='0'
                    value={cashoutAmounts[player.id] ?? ''}
                    onChange={(e) => setCashoutAmounts((prev) => ({ ...prev, [player.id]: e.target.value }))}
                    className='h-11 pl-7'
                  />
                </div>
                <p className='text-xs text-muted-foreground mt-1'>Chip value they&apos;re walking away with</p>
              </div>
            );
          })}
        </div>

        <div className='flex gap-3 mt-8'>
          <Button
            variant='outline'
            className='flex-1 h-12 text-xs tracking-widest uppercase'
            onClick={() => setShowCashout(false)}
            disabled={closingSession}
          >
            Back
          </Button>
          <Button
            className='flex-1 h-12 text-xs tracking-widest uppercase'
            onClick={handleCloseSession}
            disabled={closingSession}
          >
            {closingSession ? 'Closing…' : 'Close Session'}
          </Button>
        </div>
      </main>
    );
  }

  // ── Main session view ─────────────────────────────────────────────────────────
  return (
    <main className='min-h-screen flex flex-col max-w-lg mx-auto'>
      {/* Top bar */}
      <div className='sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between gap-3'>
        <div className='min-w-0'>
          <h1 className='text-sm font-semibold tracking-widest uppercase text-primary truncate'>{session.name}</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>{elapsed}</p>
        </div>
        <Button
          variant='destructive'
          size='sm'
          className='shrink-0 h-9 text-xs tracking-widest uppercase'
          onClick={() => setShowCashout(true)}
        >
          End Session
        </Button>
      </div>

      {/* Player tabs */}
      <div className='px-6 py-4 flex gap-2 overflow-x-auto scrollbar-none shrink-0 border-b border-border'>
        {sessionPlayers.map((player) => (
          <button
            key={player.id}
            onClick={() => {
              setSelectedPlayerId(player.id);
              setRebuyPlayerId(null);
            }}
            className={cn(
              'flex-none flex flex-col items-center gap-1 px-4 py-2.5 rounded border transition-colors min-w-[72px]',
              selectedPlayerId === player.id
                ? 'border-primary text-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            )}
          >
            <span className='text-xs font-medium truncate max-w-[80px]'>{player.name}</span>
            <span className='text-xs tabular-nums'>${tabTotal(player.id).toFixed(2)}</span>
            {isTabPaid(player.id) && (
              <span className='text-[9px] tracking-widest uppercase text-green-500'>Paid</span>
            )}
          </button>
        ))}
      </div>

      {/* Re-buy row */}
      {selectedPlayerId && (
        <div className='px-6 py-3 border-b border-border flex items-center justify-between gap-3'>
          <div className='text-xs text-muted-foreground'>
            Buy-ins: <span className='text-foreground font-medium'>${buyInTotal(selectedPlayerId).toFixed(2)}</span>
          </div>
          {rebuyPlayerId === selectedPlayerId ? (
            <div className='flex items-center gap-2'>
              <div className='relative w-28'>
                <span className='absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs'>$</span>
                <Input
                  type='number'
                  min='0'
                  step='5'
                  autoFocus
                  placeholder='20'
                  value={rebuyAmount}
                  onChange={(e) => setRebuyAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRebuy(selectedPlayerId)}
                  className='h-8 pl-6 text-sm'
                />
              </div>
              <button
                onClick={() => handleRebuy(selectedPlayerId)}
                disabled={rebuying || !rebuyAmount}
                className='text-xs tracking-widest uppercase text-primary disabled:opacity-40'
              >
                Add
              </button>
              <button
                onClick={() => { setRebuyPlayerId(null); setRebuyAmount(''); }}
                className='text-xs text-muted-foreground'
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setRebuyPlayerId(selectedPlayerId); setRebuyAmount(''); }}
              className='text-xs tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors'
            >
              + Re-buy
            </button>
          )}
        </div>
      )}

      {/* Orders list */}
      <div className='flex-1 px-6 py-4 pb-32'>
        {selectedOrders.length === 0 ? (
          <p className='text-center text-muted-foreground text-xs tracking-widest uppercase py-12'>No orders yet</p>
        ) : (
          <div className='divide-y divide-border border border-border rounded-md'>
            {selectedOrders.map((order) => (
              <div key={order.id} className='flex items-center justify-between px-4 py-3 min-h-[52px]'>
                <div className='min-w-0'>
                  <p className='text-sm'>{order.drinkName}</p>
                  <p className='text-xs text-muted-foreground'>{formatTime(order.timestamp)}</p>
                </div>
                <div className='flex items-center gap-3 shrink-0'>
                  <span className='text-sm font-semibold text-primary tabular-nums'>${order.price.toFixed(2)}</span>
                  {!order.id.startsWith('temp-') && (
                    <button
                      onClick={() => handleUndo(order)}
                      className='size-8 flex items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors'
                    >
                      <Trash2 className='size-3.5' />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mark Paid */}
      {selectedPlayerId && orders.filter((o) => o.playerId === selectedPlayerId).length > 0 && (
        <div className='px-6 pb-6'>
          <button
            onClick={() => handleMarkPaid(selectedPlayerId)}
            className={cn(
              'w-full py-3 rounded border text-xs tracking-widest uppercase font-medium transition-colors',
              isTabPaid(selectedPlayerId)
                ? 'border-green-500/50 text-green-500 hover:border-green-500'
                : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
            )}
          >
            {isTabPaid(selectedPlayerId) ? '✓ Paid — Mark Unpaid' : 'Mark Paid'}
          </button>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowPicker(true)}
        className='fixed bottom-6 right-6 size-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 transition-transform z-40 text-2xl font-light'
      >
        +
      </button>

      {showPicker && (
        <DrinkPickerModal
          drinks={drinks}
          inventory={inventory}
          onSelect={handleDrinkSelect}
          onClose={() => setShowPicker(false)}
        />
      )}
    </main>
  );
}
