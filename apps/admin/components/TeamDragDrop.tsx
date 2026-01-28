```tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from 'react-beautiful-dnd';

type Team = {
  id: string;
  name: string;
};

type Props = {
  leagueId: string;
  onUpdated?: () => void;
};

/**
 * TeamDragDrop
 *
 * - Fetches unassigned teams and teams assigned to the provided leagueId.
 * - Allows dragging a team from "Unassigned Teams" to "League Teams" (assigns to league).
 * - Allows dragging a team out back to "Unassigned" (removes league assignment).
 *
 * Note: react-beautiful-dnd must be installed:
 *  pnpm add react-beautiful-dnd
 */
export default function TeamDragDrop({ leagueId, onUpdated }: Props) {
  const [unassigned, setUnassigned] = useState<Team[]>([]);
  const [leagueTeams, setLeagueTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLists = async () => {
    setLoading(true);
    setError(null);
    try {
      const [uRes, lRes] = await Promise.all([
        fetch('/api/teams?unassigned=true'),
        fetch(`/api/teams?leagueId=${encodeURIComponent(leagueId)}`),
      ]);
      const uData = await uRes.json();
      const lData = await lRes.json();
      setUnassigned(Array.isArray(uData) ? uData : []);
      setLeagueTeams(Array.isArray(lData) ? lData : []);
    } catch (err) {
      console.error(err);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, [leagueId]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    // Dropped in same list -> reorder locally
    if (source.droppableId === destination.droppableId) {
      if (source.droppableId === 'unassigned') {
        const items = Array.from(unassigned);
        const [moved] = items.splice(source.index, 1);
        items.splice(destination.index, 0, moved);
        setUnassigned(items);
      } else {
        const items = Array.from(leagueTeams);
        const [moved] = items.splice(source.index, 1);
        items.splice(destination.index, 0, moved);
        setLeagueTeams(items);
      }
      return;
    }

    // Moving between lists: assign or unassign
    try {
      if (source.droppableId === 'unassigned' && destination.droppableId === 'league') {
        // assign team to league
        const res = await fetch(`/api/leagues/${leagueId}/teams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: draggableId }),
        });
        if (!res.ok) throw new Error(await res.text());
        // optimistic update
        const moved = unassigned.find((t) => t.id === draggableId);
        if (moved) {
          setUnassigned((prev) => prev.filter((t) => t.id !== draggableId));
          setLeagueTeams((prev) => {
            const copy = Array.from(prev);
            copy.splice(destination.index, 0, moved);
            return copy;
          });
        }
      } else if (source.droppableId === 'league' && destination.droppableId === 'unassigned') {
        // unassign team from league
        const res = await fetch(`/api/leagues/${leagueId}/teams`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: draggableId }),
        });
        if (!res.ok) throw new Error(await res.text());
        const moved = leagueTeams.find((t) => t.id === draggableId);
        if (moved) {
          setLeagueTeams((prev) => prev.filter((t) => t.id !== draggableId));
          setUnassigned((prev) => {
            const copy = Array.from(prev);
            copy.splice(destination.index, 0, moved);
            return copy;
          });
        }
      }
      onUpdated?.();
    } catch (err: any) {
      console.error('Failed to move team', err);
      setError(err?.message ?? 'Failed to move team');
      // refresh lists
      fetchLists();
    }
  };

  return (
    <div className="space-y-3">
      {loading && <div className="text-sm text-gray-500">Loading teams…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Droppable droppableId="unassigned">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="min-h-[120px] p-3 border rounded bg-gray-50"
              >
                <div className="font-medium mb-2">Unassigned Teams</div>
                {unassigned.map((team, idx) => (
                  <Draggable key={team.id} draggableId={team.id} index={idx}>
                    {(prov, snap) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        className={`p-2 mb-2 bg-white rounded shadow-sm flex items-center justify-between ${snap.isDragging ? 'opacity-90' : ''}`}
                      >
                        <div>{team.name}</div>
                        <div className="text-xs text-gray-400">drag</div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                {unassigned.length === 0 && <div className="text-sm text-gray-500">No unassigned teams</div>}
              </div>
            )}
          </Droppable>

          <Droppable droppableId="league">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="min-h-[120px] p-3 border rounded bg-white"
              >
                <div className="font-medium mb-2">Teams in League</div>
                {leagueTeams.map((team, idx) => (
                  <Draggable key={team.id} draggableId={team.id} index={idx}>
                    {(prov, snap) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        className={`p-2 mb-2 bg-gray-50 rounded flex items-center justify-between ${snap.isDragging ? 'opacity-90' : ''}`}
                      >
                        <div>{team.name}</div>
                        <div className="text-xs text-gray-400">drag</div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                {leagueTeams.length === 0 && <div className="text-sm text-gray-500">No teams in this league</div>}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>
    </div>
  );
}