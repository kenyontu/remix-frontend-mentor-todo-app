// The following code on how to handle the prisma client initialization is
// taken from the blog example:
// https://github.com/remix-run/remix/blob/main/examples/blog-tutorial/app/db.server.ts

import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

declare global {
  var __db__: PrismaClient
}

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
} else {
  if (!global.__db__) {
    global.__db__ = new PrismaClient()
  }
  prisma = global.__db__
}

export { prisma }
