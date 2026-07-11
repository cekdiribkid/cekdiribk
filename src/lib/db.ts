import { PrismaClient } from '@prisma/client'
import path from 'path'

// Ensure DATABASE_URL is set with an absolute path for Prisma SQLite compatibility
// Prisma's SQLite engine requires absolute paths - relative paths fail at runtime
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${path.join(process.cwd(), 'db', 'custom.db')}`
} else if (process.env.DATABASE_URL.startsWith('file:./') || process.env.DATABASE_URL.startsWith('file:..')) {
  // If DATABASE_URL is a relative path, resolve it to absolute
  const relativePath = process.env.DATABASE_URL.replace('file:', '')
  process.env.DATABASE_URL = `file:${path.resolve(process.cwd(), relativePath)}`
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
