```tsx
'use client';

import React, { useEffect, useState } from 'react';

type Team = {
  id: string;
  name: string;
};

type FixturePreview = {
  round: number;
  home: Team;
  away: Team;
  scheduledAt: string;
};

type Props = {
  leagueId: string;
};

/**
 * FixtureGenerator
 *
 * - Fetches teams for the league
 * - Displays a preview of a round-robin schedule (circle method)
 * - Calls POST /api/fixtures/generate to persist generated fixtures (weekly spacing by default)
 */
export default function FixtureGenerator({ leagueId }: Props) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [preview, setPreview] = useState<FixturePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams?leagueId=${encodeURIComponent(leagueId)}`, { cache: 'no-store' });
      const data = await res.json();
      setTeams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [leagueId]);

  useEffect(() => {
    const p = generateRoundRobinPreview(teams);
    setPreview(p);
  }, [teams]);

  const handleGenerate = async () => {
    if (teams.length < 2) {
      setError('At least 2 teams required to generate fixtures.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/fixtures/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      // data could be fixtures created
      alert(`Generated ${data?.length ?? 'some'} fixtures`);
      // refresh teams/preview if needed
      fetchTeams();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? 'Failed to generate fixtures');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      {loading && <div className="text-sm text-gray-500">Loading teams…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="mb-3">
        <div className="text-sm text-gray-600">Teams: {teams.length}</div>
        <ul className="mt-2 space-y-1">
          {teams.map((t) => (
            <li key={t.id} className="text-sm">
              • {t.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-3">
        <h4 className="font-medium">Preview Schedule</h4>
        {preview.length === 0 ? (
          <div className="text-sm text-gray-500">No fixtures to show.</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-auto">
            {preview.map((f, i) => (
              <div key={i} className="p-2 border rounded bg-gray-50">
                <div className="text-sm text-gray-500">Round {f.round}</div>
                <div className="font-medium">
                  {f.home.name} vs {f.away.name}
                </div>
                <div className="text-xs text-gray-400">{new Date(f.scheduledAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <button
          onClick={handleGenerate}
          disabled={generating || teams.length < 2}
          className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Generate & Persist Fixtures'}
        </button>
      </div>
    </div>
  );
}

/**
 * Round-robin (circle method) preview generator.
 * If odd number of teams, a dummy BYE team is added.
 * Schedules each round at weekly intervals starting next weekend.
 */
function generateRoundRobinPreview(teams: Team[]) {
  if (teams.length < 2) return [];

  const items = [...teams];
  const isOdd = items.length % 2 === 1;
  if (isOdd) {
    items.push({ id: 'BYE', name: 'BYE' });
  }

  const n = items.length;
  const rounds = n - 1;
  const half = n / 2;

  // start date: next Saturday at 10:00 local time
  const now = new Date();
  const daysUntilSat = ((6 - now.getDay()) + 7) % 7 || 7; // ensure next weekend
  const start = new Date(now);
  start.setDate(now.getDate() + daysUntilSat);
  start.setHours(10, 0, 0, 0);

  const schedule: { round: number; home: Team; away: Team; scheduledAt: string }[] = [];

  let rotation = items.slice(); // mutable

  for (let round = 0; round < rounds; round++) {
    const roundDate = new Date(start);
    roundDate.setDate(start.getDate() + round * 7); // weekly

    for (let i = 0; i < half; i++) {
      const t1 = rotation[i];
      const t2 = rotation[n - 1 - i];
      if (t1.id === 'BYE' || t2.id === 'BYE') continue; // skip bye matches
      schedule.push({
        round: round + 1,
        home: t1,
        away: t2,
        scheduledAt: roundDate.toISOString(),
      });
    }

    // rotate (fix first element)
    rotation = [rotation[0], ...rotation.slice(1).slice(-1), ...rotation.slice(1, -1)];
  }

  return schedule;
}