'use client';

import { use, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher, computeBalance, Order, BuyIn, Cashout, Payment, DrinkRecipe, Player } from '@/lib/bar-api';


export default function PortalPage({
  params,
}: {
  params: Promise<{ playerId: string; token: string }>;
}) {
  const { playerId, token } = use(params);

  const { data: auth, error: authError } = useSWR<{ valid: boolean; player: Player }>(
    `/api/portal/${playerId}/validate?token=${token}`,
    fetcher,
  );

  // Persist token so receipt pages can show a back button
  useEffect(() => {
    if (auth?.valid) {
      localStorage.setItem(`portal_${playerId}`, token);
    }
  }, [auth, playerId, token]);

  const { data: orders = [] }   = useSWR<Order[]>(auth?.valid ? '/api/orders' : null, fetcher);
  const { data: buyIns = [] }   = useSWR<BuyIn[]>(auth?.valid ? '/api/buyins' : null, fetcher);
  const { data: cashouts = [] } = useSWR<Cashout[]>(auth?.valid ? '/api/cashouts' : null, fetcher);
  const { data: payments = [] } = useSWR<Payment[]>(
    auth?.valid ? `/api/payments?playerId=${playerId}` : null, fetcher,
  );
  const { data: drinks = [] }   = useSWR<DrinkRecipe[]>(auth?.valid ? '/api/drinks' : null, fetcher);

  if (authError) {
    return (
      <div className='min-h-screen flex items-center justify-center px-6'>
        <div className='text-center space-y-2'>
          <p className='text-sm font-medium text-destructive'>Invalid link</p>
          <p className='text-xs text-muted-foreground'>This link may be outdated. Ask Zach for a new one.</p>
        </div>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className='min-h-screen flex items-center justify-center text-muted-foreground text-sm tracking-widest'>
        Loading…
      </div>
    );
  }

  const player = auth.player;
  const balance = computeBalance(playerId, orders, buyIns, cashouts, payments);


  return (
    <main className='min-h-screen px-6 py-10 max-w-sm mx-auto pb-16'>
      <div className='mb-10'>
        <p className='text-xs tracking-widest uppercase text-muted-foreground mb-1'>Poker Bar</p>
        <h1 className='text-xl font-semibold tracking-widest uppercase text-primary'>{player.name}</h1>
      </div>

      {/* Balance */}
      <div className='border border-border rounded-md p-6 mb-8 text-center'>
        <p className='text-xs tracking-widest uppercase text-muted-foreground mb-3'>Your Balance</p>
        {Math.abs(balance) < 0.01 ? (
          <p className='text-3xl font-bold text-muted-foreground'>All settled up</p>
        ) : balance > 0 ? (
          <>
            <p className='text-3xl font-bold text-destructive'>${balance.toFixed(2)}</p>
            <p className='text-xs text-muted-foreground mt-2 tracking-wide'>outstanding</p>
            {player.venmo && (
              <button
                onClick={() => {
                  const handle = player.venmo!.replace(/^@/, '');
                  const note = encodeURIComponent('Poker Bar');
                  const deepLink = `venmo://paycharge?txn=pay&recipients=${handle}&amount=${balance.toFixed(2)}&note=${note}`;
                  const webUrl = `https://account.venmo.com/pay?recipients=${handle}&amount=${balance.toFixed(2)}&note=${note}`;
                  window.location.href = deepLink;
                  setTimeout(() => { if (!document.hidden) window.location.href = webUrl; }, 1500);
                }}
                className='mt-4 w-full flex items-center justify-center gap-2 py-3 rounded text-sm font-bold text-white'
                style={{ background: '#3D95CE' }}
              >
                <svg width='16' height='16' viewBox='0 0 24 24' fill='white'>
                  <path d='M19.07 3C19.82 4.27 20.16 5.58 20.16 7.22C20.16 12.23 15.68 18.72 12.05 22H4.27L1 4.36L8.19 3.67L9.84 15.05C11.42 12.36 13.38 8.19 13.38 5.42C13.38 3.97 13.1 2.97 12.68 2.14L19.07 3Z' />
                </svg>
                Pay ${balance.toFixed(2)} on Venmo
              </button>
            )}
          </>
        ) : (
          <>
            <p className='text-3xl font-bold text-green-500'>${Math.abs(balance).toFixed(2)}</p>
            <p className='text-xs text-muted-foreground mt-2 tracking-wide'>in your favour</p>
          </>
        )}
      </div>

      {/* Menu */}
      {drinks.length > 0 && (
        <div>
          <p className='text-xs tracking-widest uppercase text-muted-foreground mb-4'>Menu</p>
          <div className='border border-border rounded-md divide-y divide-border'>
            {drinks.map((drink) => (
              <div key={drink.id} className='flex items-center justify-between px-4 py-3'>
                <span className='text-sm'>{drink.name}</span>
                <span className='text-sm font-semibold text-primary tabular-nums'>${drink.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </main>
  );
}
