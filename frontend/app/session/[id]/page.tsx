'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { fetcher, apiFetch, Session, Player, Order, DrinkRecipe, InventoryItem, CreateOrderResponse } from '@/lib/bar-api';
import { DrinkPickerModal } from '@/components/DrinkPickerModal';
import { Button } from '@/components/ui/button';
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
    `/api/orders?sessionId=${id}`,
    fetcher,
    { refreshInterval: 15000 }
  );
  const { data: drinks = [] } = useSWR<DrinkRecipe[]>('/api/drinks', fetcher);
  const { data: inventory = [], mutate: mutateInventory } = useSWR<InventoryItem[]>('/api/inventory', fetcher);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [ending, setEnding] = useState(false);
  const [elapsed, setElapsed] = useState('0m');

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

  const selectedOrders = orders
    .filter((o) => o.playerId === selectedPlayerId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  async function handleDrinkSelect(drink: DrinkRecipe) {
    if (!selectedPlayerId) return;
    setShowPicker(false);

    const tempId = `temp-${Date.now()}`;
    const optimistic: Order = {
      id: tempId,
      sessionId: id,
      playerId: selectedPlayerId,
      drinkId: drink.id,
      drinkName: drink.name,
      price: drink.price,
      costEstimate: drink.costEstimate,
      timestamp: new Date().toISOString(),
    };
    mutateOrders([optimistic, ...orders], false);

    try {
      const res = await apiFetch<CreateOrderResponse>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ sessionId: id, playerId: selectedPlayerId, drinkId: drink.id }),
      });
      toast.success(`${drink.name} added`);
      if (res.lowStockWarnings?.length) {
        res.lowStockWarnings.forEach((name) => toast.warning(`Low stock: ${name}`));
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

  async function handleEndSession() {
    setEnding(true);
    try {
      await apiFetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'closed' }),
      });
      router.push(`/session/${id}/summary`);
    } catch (e) {
      toast.error((e as Error).message);
      setEnding(false);
    }
  }

  if (!session) {
    return <div className='min-h-screen flex items-center justify-center text-muted-foreground text-sm tracking-widest'>Loading…</div>;
  }

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
          onClick={handleEndSession}
          disabled={ending}
        >
          {ending ? 'Ending…' : 'End Session'}
        </Button>
      </div>

      {/* Player tabs */}
      <div className='px-6 py-4 flex gap-2 overflow-x-auto scrollbar-none shrink-0 border-b border-border'>
        {sessionPlayers.map((player) => (
          <button
            key={player.id}
            onClick={() => setSelectedPlayerId(player.id)}
            className={cn(
              'flex-none flex flex-col items-center gap-1 px-4 py-2.5 rounded border transition-colors min-w-[72px]',
              selectedPlayerId === player.id
                ? 'border-primary text-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            )}
          >
            <span className='text-xs font-medium truncate max-w-[80px]'>{player.name}</span>
            <span className='text-xs tabular-nums'>${tabTotal(player.id).toFixed(2)}</span>
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className='flex-1 px-6 py-4 pb-24'>
        {selectedOrders.length === 0 ? (
          <p className='text-center text-muted-foreground text-xs tracking-widest uppercase py-12'>
            No orders yet
          </p>
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
