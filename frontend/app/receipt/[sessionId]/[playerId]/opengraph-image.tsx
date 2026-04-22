import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 600, height: 420 };
export const contentType = 'image/png';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export default async function OgImage({
  params,
}: {
  params: Promise<{ sessionId: string; playerId: string }>;
}) {
  const { sessionId, playerId } = await params;

  let session: { id: string; name: string; date: string } | null = null;
  let player: { id: string; name: string } | null = null;
  let playerOrders: { id: string; drinkName: string; price: number }[] = [];

  try {
    const [sessions, players, orders] = await Promise.all([
      fetch(`${BASE}/api/sessions`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`${BASE}/api/players`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`${BASE}/api/orders?sessionId=${sessionId}`, { cache: 'no-store' }).then((r) => r.json()),
    ]);
    session = sessions.find((s: typeof session) => s!.id === sessionId) ?? null;
    player = players.find((p: typeof player) => p!.id === playerId) ?? null;
    playerOrders = Array.isArray(orders)
      ? orders
          .filter((o: { playerId: string }) => o.playerId === playerId)
          .sort(
            (a: { timestamp: string }, b: { timestamp: string }) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          )
      : [];
  } catch {
    // render fallback below
  }

  const total = playerOrders.reduce((s, o) => s + o.price, 0);
  const date = session
    ? new Date(session.date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const GOLD = '#c9a84c';
  const DIM = '#6b6560';
  const FG = '#ede8de';
  const BG = '#0d0d0d';
  const CARD = '#111111';
  const LINE = '#2a2a2a';

  if (!session || !player) {
    return new ImageResponse(
      (
        <div
          style={{
            background: BG,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: DIM,
            fontSize: 20,
            fontFamily: 'monospace',
          }}
        >
          Receipt not found
        </div>
      ),
      { width: 600, height: 420 },
    );
  }

  const visibleOrders = playerOrders.slice(0, 6);
  const overflow = playerOrders.length - visibleOrders.length;

  return new ImageResponse(
    (
      <div
        style={{
          background: BG,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            background: CARD,
            border: `1px solid ${LINE}`,
            borderRadius: '6px',
            padding: '32px 40px',
            width: '100%',
            maxWidth: '480px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* venue */}
          <div
            style={{
              color: DIM,
              fontSize: 10,
              letterSpacing: '0.3em',
              textAlign: 'center',
              marginBottom: '6px',
            }}
          >
            P O K E R   B A R
          </div>

          {/* player name */}
          <div
            style={{
              color: GOLD,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textAlign: 'center',
              marginBottom: '4px',
            }}
          >
            {player.name.toUpperCase()}
          </div>

          {/* date */}
          <div
            style={{
              color: DIM,
              fontSize: 11,
              letterSpacing: '0.08em',
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            {date}  ·  {session.name}
          </div>

          {/* divider */}
          <div style={{ borderTop: `1px dashed ${LINE}`, marginBottom: '14px' }} />

          {/* orders */}
          {visibleOrders.map((order) => (
            <div
              key={order.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                color: FG,
                marginBottom: '7px',
              }}
            >
              <span>{order.drinkName}</span>
              <span style={{ fontWeight: 700 }}>${order.price.toFixed(2)}</span>
            </div>
          ))}
          {overflow > 0 && (
            <div style={{ color: DIM, fontSize: 11, marginBottom: '7px' }}>
              + {overflow} more
            </div>
          )}
          {playerOrders.length === 0 && (
            <div style={{ color: DIM, fontSize: 12, textAlign: 'center', padding: '6px 0' }}>
              No orders
            </div>
          )}

          {/* divider */}
          <div style={{ borderTop: `1px dashed ${LINE}`, margin: '10px 0 14px' }} />

          {/* total */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: GOLD,
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            <span>TOTAL</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    ),
    { width: 600, height: 420 },
  );
}
