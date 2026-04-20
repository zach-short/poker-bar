'use client';

import { use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher, Session, Player, Order } from '@/lib/bar-api';
import { Printer, Share2 } from 'lucide-react';

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function PlayerReceiptPage({
  params,
}: {
  params: Promise<{ id: string; playerId: string }>;
}) {
  const { id, playerId } = use(params);
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [] } = useSWR<Session[]>('/api/sessions', fetcher);
  const session = sessions.find((s) => s.id === id);

  const { data: players = [] } = useSWR<Player[]>('/api/players', fetcher);
  const player = players.find((p) => p.id === playerId);

  const { data: orders = [] } = useSWR<Order[]>(`/api/orders?sessionId=${id}`, fetcher);
  const playerOrders = orders
    .filter((o) => o.playerId === playerId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const total = playerOrders.reduce((s, o) => s + o.price, 0);

  function handlePrint() {
    window.print();
  }

  async function handleShare() {
    const title = `${player?.name ?? 'Receipt'} — ${formatDate(session?.date ?? '')}`;

    // Try to share as an image first
    if (receiptRef.current) {
      try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(receiptRef.current, {
          backgroundColor: '#0d0d0d',
          scale: 2,
          useCORS: true,
          logging: false,
        });
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((b) => b ? resolve(b) : reject(), 'image/png')
        );
        const file = new File([blob], `receipt-${player?.name ?? 'tab'}.png`, { type: 'image/png' });

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title });
          return;
        }
      } catch {
        // fall through to URL share
      }
    }

    // Fallback: share the public URL
    const publicUrl = `${window.location.origin}/receipt/${id}/${playerId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url: publicUrl });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(publicUrl);
      alert('Link copied to clipboard');
    }
  }

  if (!session || !player) {
    return (
      <div className='min-h-screen flex items-center justify-center text-muted-foreground text-sm tracking-widest'>
        Loading…
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');

        .receipt-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem 1.5rem 8rem;
        }

        .receipt-toolbar {
          width: 100%;
          max-width: 360px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
        }

        .receipt-card {
          width: 100%;
          max-width: 360px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 2rem 1.75rem;
          font-family: 'Courier Prime', 'Courier New', monospace;
        }

        .receipt-venue {
          text-align: center;
          font-size: 0.7rem;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--muted-foreground);
          margin-bottom: 0.25rem;
        }

        .receipt-title {
          text-align: center;
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--primary);
          margin-bottom: 0.15rem;
        }

        .receipt-date {
          text-align: center;
          font-size: 0.65rem;
          color: var(--muted-foreground);
          letter-spacing: 0.1em;
          margin-bottom: 1.5rem;
        }

        .receipt-divider {
          border: none;
          border-top: 1px dashed var(--border);
          margin: 1rem 0;
        }

        .receipt-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 0.5rem;
          font-size: 0.8rem;
          margin-bottom: 0.5rem;
          color: var(--foreground);
        }

        .receipt-row-time {
          font-size: 0.65rem;
          color: var(--muted-foreground);
          min-width: 52px;
          flex-shrink: 0;
        }

        .receipt-row-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .receipt-row-price {
          font-weight: 700;
          tabular-nums: auto;
          flex-shrink: 0;
        }

        .receipt-total-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--primary);
          margin-top: 0.25rem;
        }

        .receipt-footer {
          text-align: center;
          font-size: 0.6rem;
          color: var(--muted-foreground);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-top: 1.5rem;
        }

        .action-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 1rem 1.5rem;
          display: flex;
          gap: 0.75rem;
          background: var(--background);
          border-top: 1px solid var(--border);
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border-radius: 4px;
          font-size: 0.7rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: opacity 0.15s;
        }

        .action-btn:active { opacity: 0.7; }

        .action-btn-primary {
          background: var(--primary);
          color: var(--primary-foreground);
        }

        .action-btn-outline {
          background: transparent;
          color: var(--foreground);
          border: 1px solid var(--border);
        }

        @media print {
          @page {
            margin: 0;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .receipt-toolbar,
          .action-bar {
            display: none !important;
          }

          .receipt-page {
            padding: 1rem;
            justify-content: flex-start;
          }
        }
      `}</style>

      <div className='receipt-page'>
        <div className='receipt-toolbar'>
          <button
            onClick={() => router.back()}
            className='text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors'
          >
            ← Back
          </button>
        </div>

        <div className='receipt-card' ref={receiptRef}>
          <p className='receipt-venue'>Poker Bar</p>
          <p className='receipt-title'>{player.name}</p>
          <p className='receipt-date'>{formatDate(session.date)} · {session.name}</p>

          <hr className='receipt-divider' />

          {playerOrders.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted-foreground)', padding: '1rem 0' }}>
              No orders
            </p>
          ) : (
            playerOrders.map((order) => (
              <div key={order.id} className='receipt-row'>
                <span className='receipt-row-time'>{formatTime(order.timestamp)}</span>
                <span className='receipt-row-name'>{order.drinkName}</span>
                <span className='receipt-row-price'>${order.price.toFixed(2)}</span>
              </div>
            ))
          )}

          <hr className='receipt-divider' />

          <div className='receipt-total-row'>
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <p className='receipt-footer'>Thank you · Good game</p>
        </div>
      </div>

      <div className='action-bar'>
        <button className='action-btn action-btn-outline' onClick={handleShare}>
          <Share2 size={14} />
          Share
        </button>
        <button className='action-btn action-btn-primary' onClick={handlePrint}>
          <Printer size={14} />
          Save PDF
        </button>
      </div>
    </>
  );
}
