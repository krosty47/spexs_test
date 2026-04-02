import { PrismaClient, Role, EventStatus, TriggerType, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

// bcrypt hash of "password12345" with cost 12
const PASSWORD_HASH = '$2b$12$mG.QXtxZvgszMQ2QRF2X3uM18YiAOTuoGJOftI2w/.IHlyiW5Xs7O';

async function main() {
  // Seed system user (used for system-generated EventHistory entries)
  const _systemUser = await prisma.user.upsert({
    where: { email: 'system@workflow.internal' },
    update: {},
    create: {
      id: 'system',
      email: 'system@workflow.internal',
      name: 'System',
      passwordHash: 'NOLOGIN',
      role: Role.USER,
    },
  });

  // Seed users (passwords: "password12345" hashed with bcrypt cost 12)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@spexs.dev' },
    update: { passwordHash: PASSWORD_HASH },
    create: {
      email: 'admin@spexs.dev',
      name: 'Christian Coriasco',
      passwordHash: PASSWORD_HASH,
      role: Role.ADMIN,
    },
  });

  const regularUser = await prisma.user.upsert({
    where: { email: 'support@spexs.dev' },
    update: { passwordHash: PASSWORD_HASH },
    create: {
      email: 'support@spexs.dev',
      name: 'Support Agent',
      passwordHash: PASSWORD_HASH,
      role: Role.USER,
    },
  });

  // ---------------------------------------------------------------------------
  // Workflows — WhatsApp Chatbot Monitoring for SPEXS.ai
  // ---------------------------------------------------------------------------

  // 1. Chatbot Response Time (THRESHOLD)
  const workflow1Data = {
    triggerType: TriggerType.THRESHOLD,
    triggerConfig: { type: 'THRESHOLD', metric: 'wa_response_time_ms', operator: '>', value: 5000 },
    outputMessage: 'Alert: WhatsApp chatbot {{metric}} is {{value}}ms — exceeds 5s SLA',
    recipients: [
      { channel: 'IN_APP', destination: 'admin@spexs.dev' },
      { channel: 'EMAIL', destination: 'admin@spexs.dev' },
    ],
  };
  const workflow1 = await prisma.workflow.upsert({
    where: { id: 'seed-workflow-1' },
    update: workflow1Data,
    create: {
      id: 'seed-workflow-1',
      name: 'WA Chatbot Response Time',
      description: 'Triggers when WhatsApp chatbot response time exceeds 5 seconds',
      isActive: true,
      ...workflow1Data,
      userId: adminUser.id,
    },
  });

  // 2. Message Delivery Failure Rate (THRESHOLD)
  const workflow2Data = {
    triggerType: TriggerType.THRESHOLD,
    triggerConfig: {
      type: 'THRESHOLD',
      metric: 'wa_delivery_failure_pct',
      operator: '>',
      value: 5,
    },
    outputMessage: 'Alert: WhatsApp delivery failure rate at {{value}}% — check Meta API status',
    recipients: [
      { channel: 'IN_APP', destination: 'admin@spexs.dev' },
      { channel: 'EMAIL', destination: 'admin@spexs.dev' },
    ],
  };
  const workflow2 = await prisma.workflow.upsert({
    where: { id: 'seed-workflow-2' },
    update: workflow2Data,
    create: {
      id: 'seed-workflow-2',
      name: 'WA Delivery Failure Rate',
      description: 'Triggers when WhatsApp message delivery failure rate exceeds 5%',
      isActive: true,
      ...workflow2Data,
      userId: adminUser.id,
    },
  });

  // 3. Conversation Abandonment Rate (VARIANCE)
  const workflow3Data = {
    triggerType: TriggerType.VARIANCE,
    triggerConfig: { type: 'VARIANCE', baseValue: 15, deviationPercentage: 40 },
    outputMessage:
      'Warning: Conversation abandonment rate deviated to {{value}}% — review chatbot flows',
    recipients: [{ channel: 'IN_APP', destination: 'admin@spexs.dev' }],
  };
  const workflow3 = await prisma.workflow.upsert({
    where: { id: 'seed-workflow-3' },
    update: workflow3Data,
    create: {
      id: 'seed-workflow-3',
      name: 'WA Conversation Abandonment',
      description:
        'Triggers when conversation abandonment deviates more than 40% from the 15% baseline',
      isActive: true,
      ...workflow3Data,
      userId: adminUser.id,
    },
  });

  // 4. User Satisfaction Score (THRESHOLD)
  const workflow4Data = {
    triggerType: TriggerType.THRESHOLD,
    triggerConfig: { type: 'THRESHOLD', metric: 'wa_csat_score', operator: '<', value: 3.5 },
    outputMessage: 'Alert: WhatsApp chatbot CSAT dropped to {{value}} — below 3.5 threshold',
    recipients: [
      { channel: 'IN_APP', destination: 'admin@spexs.dev' },
      { channel: 'IN_APP', destination: 'support@spexs.dev' },
    ],
  };
  const workflow4 = await prisma.workflow.upsert({
    where: { id: 'seed-workflow-4' },
    update: workflow4Data,
    create: {
      id: 'seed-workflow-4',
      name: 'WA Chatbot CSAT Score',
      description: 'Triggers when WhatsApp chatbot satisfaction score drops below 3.5/5',
      isActive: true,
      ...workflow4Data,
      userId: adminUser.id,
    },
  });

  // 5. WhatsApp API Error Rate (VARIANCE)
  const workflow5Data = {
    triggerType: TriggerType.VARIANCE,
    triggerConfig: { type: 'VARIANCE', baseValue: 2, deviationPercentage: 100 },
    outputMessage: 'Critical: WA API error rate spiked to {{value}}% — investigate Meta Cloud API',
    recipients: [
      { channel: 'IN_APP', destination: 'admin@spexs.dev' },
      { channel: 'EMAIL', destination: 'admin@spexs.dev' },
    ],
  };
  const workflow5 = await prisma.workflow.upsert({
    where: { id: 'seed-workflow-5' },
    update: workflow5Data,
    create: {
      id: 'seed-workflow-5',
      name: 'WA API Error Rate',
      description: 'Triggers when WhatsApp Cloud API error rate doubles from the 2% baseline',
      isActive: true,
      ...workflow5Data,
      userId: adminUser.id,
    },
  });

  // 6. Message Queue Depth (THRESHOLD) — inactive, used for testing
  const workflow6Data = {
    triggerType: TriggerType.THRESHOLD,
    triggerConfig: { type: 'THRESHOLD', metric: 'wa_queue_depth', operator: '>=', value: 500 },
    outputMessage: 'Critical: {{value}} messages queued — WhatsApp outbound queue is backing up',
    recipients: [],
  };
  const workflow6 = await prisma.workflow.upsert({
    where: { id: 'seed-workflow-6' },
    update: workflow6Data,
    create: {
      id: 'seed-workflow-6',
      name: 'WA Message Queue Depth',
      description: 'Triggers when outbound WhatsApp message queue exceeds 500 pending messages',
      isActive: false,
      ...workflow6Data,
      userId: regularUser.id,
    },
  });

  // ---------------------------------------------------------------------------
  // Events — WhatsApp Chatbot Incidents
  // ---------------------------------------------------------------------------

  const event1 = await prisma.event.upsert({
    where: { id: 'seed-event-1' },
    update: {},
    create: {
      id: 'seed-event-1',
      title: 'Slow chatbot response — LATAM region',
      payload: {
        region: 'LATAM',
        responseTimeMs: 7200,
        endpoint: '/v17.0/messages',
        timestamp: new Date().toISOString(),
      },
      status: EventStatus.OPEN,
      workflowId: workflow1.id,
    },
  });

  const event2 = await prisma.event.upsert({
    where: { id: 'seed-event-2' },
    update: {},
    create: {
      id: 'seed-event-2',
      title: 'High delivery failures — template messages',
      payload: {
        failureRate: 8.3,
        templateName: 'order_confirmation',
        failedCount: 142,
        timestamp: new Date().toISOString(),
      },
      status: EventStatus.RESOLVED,
      workflowId: workflow2.id,
      resolvedAt: new Date(),
      resolvedById: adminUser.id,
    },
  });

  const _event3 = await prisma.event.upsert({
    where: { id: 'seed-event-3' },
    update: {},
    create: {
      id: 'seed-event-3',
      title: 'Abandonment spike — onboarding flow',
      payload: {
        flow: 'onboarding',
        abandonmentRate: 23.5,
        baselineRate: 15,
        timestamp: new Date().toISOString(),
      },
      status: EventStatus.OPEN,
      workflowId: workflow3.id,
    },
  });

  const event4 = await prisma.event.upsert({
    where: { id: 'seed-event-4' },
    update: {},
    create: {
      id: 'seed-event-4',
      title: 'CSAT drop — billing inquiries',
      payload: {
        category: 'billing',
        csatScore: 2.8,
        sampleSize: 85,
        timestamp: new Date().toISOString(),
      },
      status: EventStatus.SNOOZED,
      workflowId: workflow4.id,
    },
  });

  const _event5 = await prisma.event.upsert({
    where: { id: 'seed-event-5' },
    update: {},
    create: {
      id: 'seed-event-5',
      title: 'WA Cloud API error spike',
      payload: {
        errorRate: 4.7,
        topError: '131026 (Rate limit hit)',
        affectedNumbers: 12,
        timestamp: new Date().toISOString(),
      },
      status: EventStatus.OPEN,
      workflowId: workflow5.id,
    },
  });

  // Seed additional events for pagination testing (events 6-30)
  const scenarios = [
    { title: 'Slow response — product catalog query', flow: 'product_search' },
    { title: 'Delivery failure — promotional broadcast', flow: 'promo_broadcast' },
    { title: 'Abandonment — payment flow', flow: 'payment' },
    { title: 'Low CSAT — returns process', flow: 'returns' },
    { title: 'API timeout — webhook delivery', flow: 'webhooks' },
    { title: 'Queue backup — bulk campaign', flow: 'bulk_campaign' },
    { title: 'Slow response — FAQ bot', flow: 'faq' },
    { title: 'Delivery failure — interactive buttons', flow: 'interactive_msg' },
    { title: 'Abandonment — account linking', flow: 'account_link' },
    { title: 'API error — media upload', flow: 'media_upload' },
  ];
  const statuses = [EventStatus.OPEN, EventStatus.RESOLVED, EventStatus.SNOOZED];
  const workflows = [workflow1, workflow2, workflow3, workflow4, workflow5, workflow6];

  for (let i = 6; i <= 30; i++) {
    const scenario = scenarios[(i - 6) % scenarios.length];
    const status = statuses[i % 3];
    const workflow = workflows[i % 6];

    await prisma.event.upsert({
      where: { id: `seed-event-${i}` },
      update: {},
      create: {
        id: `seed-event-${i}`,
        title: `${scenario.title} (#${i})`,
        payload: {
          flow: scenario.flow,
          metricValue: 90 + (i % 10),
          timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        },
        status,
        workflowId: workflow.id,
        ...(status === EventStatus.RESOLVED
          ? { resolvedAt: new Date(), resolvedById: adminUser.id }
          : {}),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Event History
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------------

  await prisma.comment.upsert({
    where: { id: 'seed-comment-1' },
    update: {},
    create: {
      id: 'seed-comment-1',
      content:
        'Investigating slow response times in LATAM — may be related to Meta API routing issues in the region',
      eventId: event1.id,
      userId: adminUser.id,
    },
  });

  await prisma.comment.upsert({
    where: { id: 'seed-comment-2' },
    update: {},
    create: {
      id: 'seed-comment-2',
      content:
        'Resolved — the order_confirmation template was flagged by Meta for review. Re-approved and delivery rate is back to normal.',
      eventId: event2.id,
      userId: adminUser.id,
    },
  });

  // ---------------------------------------------------------------------------
  // Snooze record
  // ---------------------------------------------------------------------------

  await prisma.snooze.upsert({
    where: { eventId: event4.id },
    update: {},
    create: {
      id: 'seed-snooze-1',
      until: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      reason:
        'Known issue — billing FAQ responses are being reworked. New intents deploying tomorrow.',
      eventId: event4.id,
      userId: regularUser.id,
    },
  });

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  await prisma.notification.upsert({
    where: { id: 'seed-notif-1' },
    update: {},
    create: {
      id: 'seed-notif-1',
      type: NotificationType.EVENT_TRIGGERED,
      title: 'Slow chatbot response — LATAM region',
      body: 'Workflow "WA Chatbot Response Time" triggered — response time at 7200ms.',
      isRead: false,
      metadata: { eventId: 'seed-event-1', workflowId: 'seed-workflow-1' },
      userId: adminUser.id,
    },
  });

  await prisma.notification.upsert({
    where: { id: 'seed-notif-2' },
    update: {},
    create: {
      id: 'seed-notif-2',
      type: NotificationType.EVENT_RESOLVED,
      title: 'Resolved: High delivery failures — template messages',
      body: 'Event "High delivery failures — template messages" has been resolved.',
      isRead: true,
      metadata: { eventId: 'seed-event-2', workflowId: 'seed-workflow-2' },
      userId: adminUser.id,
    },
  });

  await prisma.notification.upsert({
    where: { id: 'seed-notif-3' },
    update: {},
    create: {
      id: 'seed-notif-3',
      type: NotificationType.EVENT_SNOOZED,
      title: 'Snoozed: CSAT drop — billing inquiries',
      body: 'Event "CSAT drop — billing inquiries" snoozed for 24 hours — new intents deploying tomorrow.',
      isRead: false,
      metadata: { eventId: 'seed-event-4', workflowId: 'seed-workflow-4' },
      userId: regularUser.id,
    },
  });

  await prisma.notification.upsert({
    where: { id: 'seed-notif-4' },
    update: {},
    create: {
      id: 'seed-notif-4',
      type: NotificationType.EVENT_TRIGGERED,
      title: 'Abandonment spike — onboarding flow',
      body: 'Workflow "WA Conversation Abandonment" triggered — abandonment rate at 23.5%.',
      isRead: false,
      metadata: { eventId: 'seed-event-3', workflowId: 'seed-workflow-3' },
      userId: adminUser.id,
    },
  });

  await prisma.notification.upsert({
    where: { id: 'seed-notif-5' },
    update: {},
    create: {
      id: 'seed-notif-5',
      type: NotificationType.EVENT_TRIGGERED,
      title: 'WA Cloud API error spike',
      body: 'Workflow "WA API Error Rate" triggered — error rate at 4.7%, top error: rate limit hit.',
      isRead: false,
      metadata: { eventId: 'seed-event-5', workflowId: 'seed-workflow-5' },
      userId: adminUser.id,
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
