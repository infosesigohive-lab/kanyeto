```ts
import { NextResponse } from 'next/server';
import { prisma } from '../../../../packages/db/src/prisma';

// GET: list leagues
// POST: create a league
export async function GET() {
  const leagues = await prisma.league.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(leagues);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name || '').trim();
    const startDate = body.startDate ? new Date(body.startDate) : null;
    const teamLimit = body.teamLimit == null ? null : Number(body.teamLimit);

    if (!name) return new NextResponse('Missing league name', { status: 400 });

    const created = await prisma.league.create({
      data: {
        name,
        // store startDate in a league metadata field if you have one; here we can use createdAt as reference
        // You may want to add startDate column to Prisma model if you need it persisted (adjust schema).
        // For now store startDate in a JSON metadata column or skip storing -> we store as createdAt override for demo:
        createdAt: startDate ?? undefined,
      },
    });

    // If teamLimit needs to be stored, add column to Prisma model. For now return with provided values.
    const response = { id: created.id, name: created.name, startDate: startDate?.toISOString() ?? null, teamLimit };
    return NextResponse.json(response);
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err?.message ?? 'Server error', { status: 500 });
  }
}