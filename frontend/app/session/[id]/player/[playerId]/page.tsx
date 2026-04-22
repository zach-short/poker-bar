'use client';

import { use, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher, Session, Player, Order } from '@/lib/bar-api';
import { Printer, Share2 } from 'lucide-react';

const GOLD = '#c9a84c';
const DIM  = '#6b6560';
const FG   = '#ede8de';
const BG   = '#0d0d0d';
const LINE = '#2a2a2a';
const FONT = '"Courier New", monospace';

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function drawReceiptCanvas(
  player: Player,
  session: Session,
  orders: Order[],
  total: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const W = 720;
    const PAD = 56;
    const ROW = 42;
    const headerH = 210;
    const footerH = 100;
    const H = headerH + orders.length * ROW + footerH + (orders.length > 0 ? 80 : 40);

    const canvas = document.createElement('canvas');
    canvas.width  = W * 2;   // 2× for retina
    canvas.height = H * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);

    // background
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    let y = 52;

    // venue
    ctx.fillStyle = DIM;
    ctx.font = `600 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('P O K E R   B A R', W / 2, y);
    y += 36;

    // player name
    ctx.fillStyle = GOLD;
    ctx.font = `bold 32px ${FONT}`;
    ctx.fillText(player.name.toUpperCase(), W / 2, y);
    y += 32;

    // date + session
    ctx.fillStyle = DIM;
    ctx.font = `14px ${FONT}`;
    ctx.fillText(`${formatDate(session.date)}  ·  ${session.name}`, W / 2, y);
    y += 36;

    // dashed rule
    const drawRule = (yPos: number) => {
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(PAD, yPos);
      ctx.lineTo(W - PAD, yPos);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawRule(y);
    y += 28;

    // orders
    ctx.textAlign = 'left';
    for (const order of orders) {
      ctx.fillStyle = DIM;
      ctx.font = `13px ${FONT}`;
      ctx.fillText(formatTime(order.timestamp), PAD, y);

      ctx.fillStyle = FG;
      ctx.font = `15px ${FONT}`;
      ctx.fillText(order.drinkName, PAD + 90, y);

      ctx.fillStyle = FG;
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(`$${order.price.toFixed(2)}`, W - PAD, y);
      ctx.textAlign = 'left';

      y += ROW;
    }

    if (orders.length === 0) {
      ctx.fillStyle = DIM;
      ctx.font = `14px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('No orders', W / 2, y);
      ctx.textAlign = 'left';
      y += ROW;
    }

    y += 10;
    drawRule(y);
    y += 34;

    // total
    ctx.fillStyle = GOLD;
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('TOTAL', PAD, y);
    ctx.textAlign = 'right';
    ctx.fillText(`$${total.toFixed(2)}`, W - PAD, y);
    y += 48;

    // footer
    ctx.fillStyle = DIM;
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('T H A N K   Y O U  ·  G O O D   G A M E', W / 2, y);

    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/png',
    );
  });
}

export default function PlayerReceiptPage({
  params,
}: {
  params: Promise<{ id: string; playerId: string }>;
}) {
  const { id, playerId } = use(params);
  const router = useRouter();

  const { data: sessions = [] } = useSWR<Session[]>('/api/sessions', fetcher);
  const session = sessions.find((s) => s.id === id);

  const { data: players = [] } = useSWR<Player[]>('/api/players', fetcher);
  const player = players.find((p) => p.id === playerId);

  const { data: orders = [] } = useSWR<Order[]>(`/api/orders?sessionId=${id}`, fetcher);
  const playerOrders = orders
    .filter((o) => o.playerId === playerId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const total = playerOrders.reduce((s, o) => s + o.price, 0);

  // Pre-render receipt image in the background so share is instant
  const imageBlobRef = useRef<Blob | null>(null);
  useEffect(() => {
    if (!player || !session) return;
    drawReceiptCanvas(player, session, playerOrders, total)
      .then((blob) => { imageBlobRef.current = blob; })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id, session?.id, orders.length]);

  function handlePrint() {
    window.print();
  }

  async function handleShare() {
    const title = `${player?.name ?? 'Receipt'} — ${formatDate(session?.date ?? '')}`;

    // Share pre-rendered image (no async work here — gesture chain intact)
    if (imageBlobRef.current && navigator.canShare) {
      const file = new File(
        [imageBlobRef.current],
        `receipt-${player?.name ?? 'tab'}.png`,
        { type: 'image/png' },
      );
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title });
          return;
        } catch {
          // cancelled or denied — fall through
        }
      }
    }

    // Fallback: share the public URL
    const publicUrl = `${window.location.origin}/receipt/${id}/${playerId}`;
    if (navigator.share) {
      try { await navigator.share({ title, url: publicUrl }); } catch { /* cancelled */ }
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
          @page { margin: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .receipt-toolbar, .action-bar { display: none !important; }
          .receipt-page { padding: 1rem; justify-content: flex-start; }
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

        <div className='receipt-card'>
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
