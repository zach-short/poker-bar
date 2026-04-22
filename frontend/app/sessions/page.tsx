'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher, formatDate, Session, Player } from '@/lib/bar-api';

export default function SessionsPage() {
  const router = useRouter();
  const { data: sessions = [], isLoading } = useSWR<Session[]>('/api/sessions', fetcher);
  const { data: players = [] } = useSWR<Player[]>('/api/players', fetcher);

  const playerMap = new Map(players.map((p) => [p.id, p.name]));

  const sorted = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  function handleClick(s: Session) {
    router.push(s.status === 'active' ? `/session/${s.id}` : `/session/${s.id}/summary`);
  }

  return (
    <main className='min-h-screen px-6 py-10 max-w-sm mx-auto'>
      <div className='flex items-center justify-between mb-10'>
        <div>
          <h1 className='text-base font-semibold tracking-widest uppercase text-primary'>Sessions</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>{sessions.length} total</p>
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

      {!isLoading && sessions.length === 0 && (
        <p className='text-center text-muted-foreground text-xs tracking-widest uppercase py-12'>No sessions yet</p>
      )}

      <div className='space-y-3'>
        {sorted.map((session) => {
          const names = session.playerIds.map((id) => playerMap.get(id)).filter(Boolean);
          return (
            <button
              key={session.id}
              onClick={() => handleClick(session)}
              className='w-full text-left border border-border rounded-md px-4 py-4 hover:border-primary/50 transition-colors'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='text-sm font-medium truncate'>{session.name}</p>
                  <p className='text-xs text-muted-foreground mt-0.5'>{formatDate(session.date)}</p>
                  {names.length > 0 && (
                    <p className='text-xs text-muted-foreground mt-1 truncate'>{names.join(', ')}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 text-[10px] tracking-widest uppercase px-2 py-0.5 rounded border mt-0.5 ${
                    session.status === 'active'
                      ? 'border-primary text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {session.status}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </main>
  );
}
