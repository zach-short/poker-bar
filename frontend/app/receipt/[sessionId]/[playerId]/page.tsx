import { Metadata } from 'next';
import ReceiptUI from './receipt-ui';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

async function getReceiptMeta(sessionId: string, playerId: string) {
  try {
    const [sessions, players] = await Promise.all([
      fetch(`${BASE}/api/sessions`, { next: { revalidate: 0 } }).then((r) =>
        r.json(),
      ),
      fetch(`${BASE}/api/players`, { next: { revalidate: 0 } }).then((r) =>
        r.json(),
      ),
    ]);
    const session = sessions.find(
      (s: { id: string; date: string; name: string }) => s.id === sessionId,
    );
    const player = players.find(
      (p: { id: string; name: string }) => p.id === playerId,
    );
    return { session, player };
  } catch {
    return { session: null, player: null };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string; playerId: string }>;
}): Promise<Metadata> {
  const { sessionId, playerId } = await params;
  const { session, player } = await getReceiptMeta(sessionId, playerId);

  if (!session || !player) return { title: 'Receipt' };

  const date = new Date(session.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return { title: { absolute: `${player.name} Receipt — ${date}` } };
}

export default function PublicReceiptPage({
  params,
}: {
  params: Promise<{ sessionId: string; playerId: string }>;
}) {
  return <ReceiptUI params={params} />;
}
