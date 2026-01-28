```tsx
'use client';

import React, { useState } from 'react';

type Props = {
  onCreated?: (league: { id: string; name: string; startDate: string | null; teamLimit: number | null }) => void;
};

export default function LeagueForm({ onCreated }: Props) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [teamLimit, setTeamLimit] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setStartDate('');
    setTeamLimit('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('League name is required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        startDate: startDate ? new Date(startDate).toISOString() : null,
        teamLimit: teamLimit === '' ? null : Number(teamLimit),
      };

      const res = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to create league');
      }

      const created = await res.json();
      reset();
      onCreated?.(created);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700">League Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full border-gray-300 rounded-md p-2"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            type="date"
            className="mt-1 block w-full border-gray-300 rounded-md p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Team Limit</label>
          <input
            value={teamLimit}
            onChange={(e) => setTeamLimit(e.target.value === '' ? '' : Number(e.target.value))}
            type="number"
            min={2}
            placeholder="e.g., 8"
            className="mt-1 block w-full border-gray-300 rounded-md p-2"
          />
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create League'}
        </button>
      </div>
    </form>
  );
}