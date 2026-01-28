```ts
import { NextResponse } from 'next/server';
import { prisma } from '../../../../packages/db/src/prisma';

/**
 * POST { leagueId }
 * - loads teams in the league
 * - runs round-robin generator (skips BYEs)
 * - creates fixtures (one round per week, starting next Saturday at 10:00)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const leagueId = body.leagueId;
    if (!leagueId) return new NextResponse('Missing leagueId', { status: 400 });

    const teams = await prisma.team.findMany({
      where: { leagueId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    if (teams.length < 2) {
      return new NextResponse('At least two teams are required', { status: 400 });
    }

    // Build round-robin schedule (server-side)
    const items = teams.map((t) => ({ id: t.id, name: t.name }));
    const isOdd = items.length % 2 === 1;
    if (isOdd) {
      items.push({ id: 'BYE', name: 'BYE' } as any);
    }

    const n = items.length;
    const rounds = n - 1;
    const half = n / 2;

    // compute first round date: next Saturday at 10:00
    const now = new Date();
    const daysUntilSat = ((6 - now.getDay()) + 7) % 7 || 7;
    const start = new Date(now);
    start.setDate(now.getDate() + daysUntilSat);
    start.setHours(10, 0, 0, 0);

    let rotation = items.slice();
    const createdFixtures: any[] = [];

    for (let round = 0; round < rounds; round++) {
      const roundDate = new Date(start);
      roundDate.setDate(start.getDate() + round * 7); // weekly

      const pairs: Array<{ homeId: string; awayId: string }> = [];
      for (let i = 0; i < half; i++) {
        const t1 = rotation[i];
        const t2 = rotation[n - 1 - i];
        if (t1.id === 'BYE' || t2.id === 'BYE') continue;
        pairs.push({ homeId: t1.id, awayId: t2.id });
      }

      // persist pairs as fixtures
      for (const p of pairs) {
        const f = await prisma.fixture.create({
          data: {
            leagueId,
            homeTeamId: p.homeId,
            awayTeamId: p.awayId,
            scheduledAt: roundDate,
            status: 'SCHEDULED',
          },
        });
        createdFixtures.push(f);
      }

      // rotate (keep first element fixed)
      rotation = [rotation[0], ...rotation.slice(1).slice(-1), ...rotation.slice(1, -1)];
    }

    return NextResponse.json(createdFixtures);
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err?.message ?? 'Server error', { status: 500 });
  }
}