import { PrismaClient, Role, EventStatus } from '@prisma/client';

const prisma = new PrismaClient();

// bcrypt hash of "password12345" with cost 12
const PASSWORD_HASH = '$2b$12$mG.QXtxZvgszMQ2QRF2X3uM18YiAOTuoGJOftI2w/.IHlyiW5Xs7O';

async function main() {
  // Seed users (passwords: "password12345" hashed with bcrypt cost 12)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@workflow.dev' },
    update: { passwordHash: PASSWORD_HASH },
    create: {
      email: 'admin@workflow.dev',
      name: 'Admin User',
      passwordHash: PASSWORD_HASH,
      role: Role.ADMIN,
    },
  });

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@workflow.dev' },
    update: { passwordHash: PASSWORD_HASH },
    create: {
      email: 'user@workflow.dev',
      name: 'Regular User',
      passwordHash: PASSWORD_HASH,
      role: Role.USER,
    },
  });

  // Seed workflows
  const workflow1 = await prisma.workflow.upsert({
    where: { id: 'seed-workflow-1' },
    update: {},
    create: {
      id: 'seed-workflow-1',
      name: 'CPU Usage Alert',
      description: 'Triggers when CPU usage exceeds 90%',
      isActive: true,
      userId: adminUser.id,
    },
  });

  const workflow2 = await prisma.workflow.upsert({
    where: { id: 'seed-workflow-2' },
    update: {},
    create: {
      id: 'seed-workflow-2',
      name: 'Memory Threshold',
      description: 'Triggers when memory usage exceeds 85%',
      isActive: true,
      userId: adminUser.id,
    },
  });

  const workflow3 = await prisma.workflow.upsert({
    where: { id: 'seed-workflow-3' },
    update: {},
    create: {
      id: 'seed-workflow-3',
      name: 'Disk Space Monitor',
      description: 'Monitors disk space and alerts at 95% capacity',
      isActive: false,
      userId: regularUser.id,
    },
  });

  // Seed events
  const event1 = await prisma.event.upsert({
    where: { id: 'seed-event-1' },
    update: {},
    create: {
      id: 'seed-event-1',
      title: 'High CPU on server-01',
      payload: { server: 'server-01', cpuUsage: 95, timestamp: new Date().toISOString() },
      status: EventStatus.OPEN,
      workflowId: workflow1.id,
    },
  });

  const event2 = await prisma.event.upsert({
    where: { id: 'seed-event-2' },
    update: {},
    create: {
      id: 'seed-event-2',
      title: 'High CPU on server-02',
      payload: { server: 'server-02', cpuUsage: 92, timestamp: new Date().toISOString() },
      status: EventStatus.RESOLVED,
      workflowId: workflow1.id,
      resolvedAt: new Date(),
      resolvedById: adminUser.id,
    },
  });

  const _event3 = await prisma.event.upsert({
    where: { id: 'seed-event-3' },
    update: {},
    create: {
      id: 'seed-event-3',
      title: 'Memory spike on db-primary',
      payload: { server: 'db-primary', memoryUsage: 88, timestamp: new Date().toISOString() },
      status: EventStatus.OPEN,
      workflowId: workflow2.id,
    },
  });

  const event4 = await prisma.event.upsert({
    where: { id: 'seed-event-4' },
    update: {},
    create: {
      id: 'seed-event-4',
      title: 'Memory warning on cache-01',
      payload: { server: 'cache-01', memoryUsage: 86, timestamp: new Date().toISOString() },
      status: EventStatus.SNOOZED,
      workflowId: workflow2.id,
    },
  });

  const _event5 = await prisma.event.upsert({
    where: { id: 'seed-event-5' },
    update: {},
    create: {
      id: 'seed-event-5',
      title: 'Disk usage critical on storage-01',
      payload: { server: 'storage-01', diskUsage: 96, timestamp: new Date().toISOString() },
      status: EventStatus.OPEN,
      workflowId: workflow3.id,
    },
  });

  // Seed event history
  await prisma.eventHistory.upsert({
    where: { id: 'seed-history-1' },
    update: {},
    create: {
      id: 'seed-history-1',
      action: 'CREATED',
      eventId: event1.id,
      userId: adminUser.id,
    },
  });

  await prisma.eventHistory.upsert({
    where: { id: 'seed-history-2' },
    update: {},
    create: {
      id: 'seed-history-2',
      action: 'RESOLVED',
      eventId: event2.id,
      userId: adminUser.id,
    },
  });

  await prisma.eventHistory.upsert({
    where: { id: 'seed-history-3' },
    update: {},
    create: {
      id: 'seed-history-3',
      action: 'SNOOZED',
      eventId: event4.id,
      userId: regularUser.id,
    },
  });

  // Seed comments
  await prisma.comment.upsert({
    where: { id: 'seed-comment-1' },
    update: {},
    create: {
      id: 'seed-comment-1',
      content: 'Investigating high CPU usage on server-01',
      eventId: event1.id,
      userId: adminUser.id,
    },
  });

  await prisma.comment.upsert({
    where: { id: 'seed-comment-2' },
    update: {},
    create: {
      id: 'seed-comment-2',
      content: 'Resolved by scaling down background jobs',
      eventId: event2.id,
      userId: adminUser.id,
    },
  });

  // Seed snooze record
  await prisma.snooze.upsert({
    where: { eventId: event4.id },
    update: {},
    create: {
      id: 'seed-snooze-1',
      until: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      reason: 'Known issue, maintenance window scheduled',
      eventId: event4.id,
      userId: regularUser.id,
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
