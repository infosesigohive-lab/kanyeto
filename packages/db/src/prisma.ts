```ts
// Lightweight Prisma client wrapper used by admin API routes.
// Ensure packages/db is a workspace package exporting Prisma client in your real repo.
// Install: pnpm add -w prisma @prisma/client
import { PrismaClient } from '@prisma/client';

declare global {
  // Avoid multiple instances in dev
  var __prismaClient__: PrismaClient | undefined;
}

export const prisma =
  global.__prismaClient__ ??
  new PrismaClient({
    log: ['query', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prismaClient__ = prisma;
}