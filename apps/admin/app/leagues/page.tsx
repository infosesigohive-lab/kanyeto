```tsx
'use client';

import React, { useEffect, useState } from 'react';
import LeagueForm from '../../components/LeagueForm';
import TeamDragDrop from '../../components/TeamDragDrop';
import FixtureGenerator from '../../components/FixtureGenerator';

type League = {
  id: string;
  name: string;
  startDate: string | null;
  teamLimit: number | null;
};

export default function LeaguesAdminPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLeagues = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leagues', { cache: 'no-store' });
      const data = await res.json();
      setLeagues(Array.isArray(data) ? data : []);
      if (!selectedLeagueId && data?.length) {
        setSelectedLeagueId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load leagues', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeagues();
  }, []);

  const onLeagueCreated = (league: League) => {
    setLeagues((prev) => [league, ...prev]);
    setSelectedLeagueId(league.id);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin — Leagues</h1>

      <section className="bg-white p-4 rounded-md shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Create New League</h2>
        <LeagueForm onCreated={onLeagueCreated} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <aside className="col-span-1 bg-white p-4 rounded-md shadow-sm">
          <h3 className="font-medium mb-2">Leagues</h3>
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : (
            <ul className="space-y-2">
              {leagues.map((l) => (
                <li key={l.id}>
                  <button
                    onClick={() => setSelectedLeagueId(l.id)}
                    className={`w-full text-left p-2 rounded ${
                      selectedLeagueId === l.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{l.name}</div>
                    <div className="text-xs text-gray-500">
                      Start: {l.startDate ? new Date(l.startDate).toLocaleDateString() : '—'} • Limit: {l.teamLimit ?? '—'}
                    </div>
                  </button>
                </li>
              ))}
              {leagues.length === 0 && <li className="text-sm text-gray-500">No leagues created yet.</li>}
            </ul>
          )}
        </aside>

        <main className="col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-md shadow-sm">
            <h3 className="font-medium mb-2">Assign Teams to League</h3>
            {!selectedLeagueId ? (
              <div className="text-sm text-gray-500">Select a league to assign teams into.</div>
            ) : (
              <TeamDragDrop leagueId={selectedLeagueId} onUpdated={() => fetchLeagues()} />
            )}
          </div>

          <div className="bg-white p-4 rounded-md shadow-sm">
            <h3 className="font-medium mb-2">Generate Fixtures (Round-Robin)</h3>
            {selectedLeagueId ? (
              <FixtureGenerator leagueId={selectedLeagueId} />
            ) : (
              <div className="text-sm text-gray-500">Select a league to generate fixtures for.</div>
            )}
          </div>
        </main>
      </section>
    </div>
  );
}