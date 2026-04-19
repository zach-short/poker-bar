'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { fetcher, apiFetch, Player, Session } from '@/lib/bar-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NewSessionPage() {
  const router = useRouter();
  const { data: players = [], mutate } = useSWR<Player[]>(
    '/api/players',
    fetcher,
  );

  const [name, setName] = useState('Poker');
  const [selected, setSelected] = useState<Player[]>([]);
  const [search, setSearch] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);

  const filtered = players.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      !selected.find((s) => s.id === p.id),
  );

  async function addNewPlayer() {
    if (!newPlayerName.trim()) return;
    setCreating(true);
    try {
      const player = await apiFetch<Player>('/api/players', {
        method: 'POST',
        body: JSON.stringify({ name: newPlayerName.trim() }),
      });
      await mutate();
      setSelected((prev) => [...prev, player]);
      setNewPlayerName('');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function startSession() {
    if (!name.trim()) return;
    setStarting(true);
    try {
      const session = await apiFetch<Session>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          playerIds: selected.map((p) => p.id),
        }),
      });
      router.push(`/session/${session.id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setStarting(false);
    }
  }

  return (
    <main className='min-h-screen px-6 py-10 max-w-sm mx-auto'>
      <div className='flex items-center justify-between mb-10'>
        <button
          onClick={() => router.back()}
          className='text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors min-h-[44px]'
        >
          ← Back
        </button>
        <h1 className='text-base font-semibold tracking-widest uppercase text-primary'>
          New Session
        </h1>
        <span className='w-16' />
      </div>

      <div className='space-y-6'>
        <div>
          <label className='text-xs tracking-widest uppercase text-muted-foreground mb-2 block'>
            Session name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='h-11'
            placeholder='Poker Night — Apr 11'
          />
        </div>

        <div>
          <label className='text-xs tracking-widest uppercase text-muted-foreground mb-2 block'>
            Players
          </label>
          {selected.length > 0 && (
            <div className='flex flex-wrap gap-2 mb-3'>
              {selected.map((p) => (
                <span
                  key={p.id}
                  className='inline-flex items-center gap-2 px-3 py-1 border border-primary/50 rounded text-sm text-primary'
                >
                  {p.name}
                  <button
                    onClick={() =>
                      setSelected((prev) => prev.filter((x) => x.id !== p.id))
                    }
                    className='text-primary/60 hover:text-primary leading-none'
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='h-11 mb-2'
            placeholder='Search players…'
          />
          {filtered.length > 0 && (
            <div className='border border-border rounded-md divide-y divide-border'>
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelected((prev) => [...prev, p]);
                    setSearch('');
                  }}
                  className='w-full text-left px-4 py-3 text-sm hover:bg-secondary transition-colors min-h-[44px]'
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className='text-xs tracking-widest uppercase text-muted-foreground mb-2 block'>
            Add new player
          </label>
          <div className='flex gap-2'>
            <Input
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNewPlayer()}
              className='h-11'
              placeholder='Name'
            />
            <Button
              onClick={addNewPlayer}
              disabled={creating || !newPlayerName.trim()}
              className='h-11 px-5 shrink-0 text-sm tracking-widest'
            >
              +
            </Button>
          </div>
        </div>

        <Button
          size='lg'
          className='w-full h-12 text-xs tracking-widest uppercase mt-2'
          onClick={startSession}
          disabled={starting || !name.trim() || selected.length === 0}
        >
          {starting ? 'Starting…' : 'Start Session'}
        </Button>
      </div>
    </main>
  );
}
