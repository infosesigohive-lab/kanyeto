```ts
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../packages/db/src/prisma';

// POST: assign team to league { teamId }
// DELETE: unassign team from league { teamId }
export async function POST(req: Request, { params }: { params: { leagueId: string } }) {
  try {
    const leagueId = params.leagueId;
    const { teamId } = await req.json();
    if (!teamId) return new NextResponse('Missing teamId', { status: 400 });

    // Optional: enforce team limit, permission checks, etc.
    await prisma.team.update({
      where: { id: teamId },
      data: { leagueId },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err?.message ?? 'Server error', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { leagueId: string } }) {
  try {
    const { teamId } = await req.json();
    if (!teamId) return new NextResponse('Missing teamId', { status: 400 });

    // Unassign team (set leagueId = null)
    await prisma.team.update({
      where: { id: teamId },
      data: { leagueId: null },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err?.message ?? 'Server error', { status: 500 });
  }
}