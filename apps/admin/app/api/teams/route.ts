```ts
import { NextResponse } from 'next/server';
import { prisma } from '../../../../packages/db/src/prisma';

// GET teams:
// - ?unassigned=true  => teams without a league
// - ?leagueId=...     => teams in league
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const unassigned = url.searchParams.get('unassigned');
    const leagueId = url.searchParams.get('leagueId');

    if (unassigned === 'true') {
      const teams = await prisma.team.findMany({
        where: { leagueId: null },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });
      return NextResponse.json(teams);
    }

    if (leagueId) {
      const teams = await prisma.team.findMany({
        where: { leagueId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });
      return NextResponse.json(teams);
    }

    // otherwise return all teams
    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, leagueId: true },
    });
    return NextResponse.json(teams);
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err?.message ?? 'Server error', { status: 500 });
  }
}