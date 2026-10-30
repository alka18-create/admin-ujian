import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const deleted = await prisma.teacher.deleteMany({})
    console.log(`Successfully deleted ${deleted.count} teachers.`)
  } catch (err) {
    console.error('Error deleting teachers:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
