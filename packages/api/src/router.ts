import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { prisma } from '@sesigo/db'; // alias to packages/db client

const t = initTRPC.create();

export const appRouter = t.router({
  getLeagues: t.procedure.query(async () => {
    return prisma.league.findMany({
      include: { teams: true }
    });
  }),

  reportInjury: t.procedure
    .input(z.object({
      playerId: z.string(),
      description: z.string(),
      severity: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      // ctx contains user info from auth middleware
      const injury = await prisma.injury.create({
        data: {
          playerId: input.playerId,
          reportedBy: ctx.userId,
          description: input.description,
          severity: input.severity
        }
      });
      // optionally enqueue notifications
      return injury;
    })
});
export type AppRouter = typeof appRouter;