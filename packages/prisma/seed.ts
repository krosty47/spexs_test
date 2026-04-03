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

  // 1. Slow Bot Replies (THRESHOLD)
  const workflow1Data = {
    triggerType: TriggerType.THRESHOLD,
    triggerConfig: { type: 'THRESHOLD', metric: 'wa_response_time_ms', operator: '>', value: 5000 },
    outputMessage:
      'Your chatbot is taking too long to reply ({{value}}ms). Users expect answers in under 5 seconds — check if your bot or the WhatsApp API is running slow.',
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
      name: 'Slow Bot Replies',
      description:
        'Get alerted when your chatbot takes more than 5 seconds to respond — slow replies cause users to leave the conversation.',
      isActive: true,
      ...workflow1Data,
      userId: adminUser.id,
    },
  });

  // 2. Messages Not Delivered (THRESHOLD)
  const workflow2Data = {
    triggerType: TriggerType.THRESHOLD,
    triggerConfig: {
      type: 'THRESHOLD',
      metric: 'wa_delivery_failure_pct',
      operator: '>',
      value: 5,
    },
    outputMessage:
      '{{value}}% of your messages are failing to deliver. This usually means a problem with the WhatsApp API or your message templates.',
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
      name: 'Messages Not Delivered',
      description:
        'Get alerted when more than 5% of outgoing messages fail to reach users — could indicate a template issue or WhatsApp API outage.',
      isActive: true,
      ...workflow2Data,
      userId: adminUser.id,
    },
  });

  // 3. Users Dropping Off Conversations (VARIANCE)
  const workflow3Data = {
    triggerType: TriggerType.VARIANCE,
    triggerConfig: { type: 'VARIANCE', baseValue: 15, deviationPercentage: 40 },
    outputMessage:
      'More users than usual are leaving conversations without finishing ({{value}}%). Review your chatbot flows — something might be confusing or broken.',
    recipients: [{ channel: 'IN_APP', destination: 'admin@spexs.dev' }],
  };
  const workflow3 = await prisma.workflow.upsert({
    where: { id: 'seed-workflow-3' },
    update: workflow3Data,
    create: {
      id: 'seed-workflow-3',
      name: 'Users Dropping Off Conversations',
      description:
        'Get alerted when the conversation drop-off rate changes significantly from the usual 15% baseline — a spike usually means a broken or confusing bot flow.',
      isActive: true,
      ...workflow3Data,
      userId: adminUser.id,
    },
  });

  // 4. Low Customer Satisfaction (THRESHOLD)
  const workflow4Data = {
    triggerType: TriggerType.THRESHOLD,
    triggerConfig: { type: 'THRESHOLD', metric: 'wa_csat_score', operator: '<', value: 3.5 },
    outputMessage:
      'Customer satisfaction dropped to {{value}}/5. Users are not happy with the chatbot experience — review recent conversations to find what went wrong.',
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
      name: 'Low Customer Satisfaction',
      description:
        'Get alerted when users rate the chatbot below 3.5 out of 5 — helps you catch bad experiences early and improve bot responses.',
      isActive: true,
      ...workflow4Data,
      userId: adminUser.id,
    },
  });

  // 5. Unusual API Error Spike (VARIANCE)
  const workflow5Data = {
    triggerType: TriggerType.VARIANCE,
    triggerConfig: { type: 'VARIANCE', baseValue: 2, deviationPercentage: 100 },
    outputMessage:
      'WhatsApp API errors jumped to {{value}}% — that is much higher than the usual 2%. This might be a rate limit or an outage on Meta side.',
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
      name: 'Unusual API Error Spike',
      description:
        'Get alerted when WhatsApp API errors double from the normal 2% rate — usually means Meta is having issues or you are hitting rate limits.',
      isActive: true,
      ...workflow5Data,
      userId: adminUser.id,
    },
  });

  // 6. Message Queue Backing Up (THRESHOLD) — inactive, used for testing
  const workflow6Data = {
    triggerType: TriggerType.THRESHOLD,
    triggerConfig: { type: 'THRESHOLD', metric: 'wa_queue_depth', operator: '>=', value: 500 },
    outputMessage:
      '{{value}} messages are waiting to be sent — your outbound queue is backing up. This can cause delays for all users.',
    recipients: [],
  };
  const workflow6 = await prisma.workflow.upsert({
    where: { id: 'seed-workflow-6' },
    update: workflow6Data,
    create: {
      id: 'seed-workflow-6',
      name: 'Message Queue Backing Up',
      description:
        'Get alerted when more than 500 messages are waiting to be sent — means your bot cannot keep up with the volume of conversations.',
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
      title: 'Bot replying slow in LATAM region',
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
      title: 'Order confirmation messages not reaching users',
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
      title: 'Users leaving during onboarding flow',
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
      title: 'Bad ratings on billing questions',
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
      title: 'WhatsApp API errors spiking — possible rate limit',
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
    { title: 'Bot slow when searching products', flow: 'product_search' },
    { title: 'Promo messages not being delivered', flow: 'promo_broadcast' },
    { title: 'Users leaving during payment', flow: 'payment' },
    { title: 'Bad ratings on returns process', flow: 'returns' },
    { title: 'Webhook deliveries timing out', flow: 'webhooks' },
    { title: 'Messages piling up during campaign', flow: 'bulk_campaign' },
    { title: 'FAQ bot responding too slowly', flow: 'faq' },
    { title: 'Interactive button messages failing', flow: 'interactive_msg' },
    { title: 'Users abandoning account linking', flow: 'account_link' },
    { title: 'Errors when uploading images/files', flow: 'media_upload' },
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
        'Looking into this — the bot is slow only in LATAM, so it might be a Meta API routing issue in that region.',
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
        'Fixed! The order confirmation template got flagged by Meta for review. We re-approved it and deliveries are back to normal.',
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
        'We know about this — the billing FAQ answers are being rewritten. New version goes live tomorrow.',
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
      title: 'Bot replying slow in LATAM region',
      body: 'Your "Slow Bot Replies" workflow triggered — response time hit 7200ms (limit is 5000ms).',
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
      title: 'Resolved: Order confirmation messages not reaching users',
      body: 'The delivery issue has been resolved — the template was re-approved and messages are going through again.',
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
      title: 'Snoozed: Bad ratings on billing questions',
      body: 'Snoozed for 24 hours — the billing FAQ answers are being rewritten and go live tomorrow.',
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
      title: 'Users leaving during onboarding flow',
      body: 'Your "Users Dropping Off Conversations" workflow triggered — drop-off rate jumped to 23.5% (baseline is 15%).',
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
      title: 'WhatsApp API errors spiking — possible rate limit',
      body: 'Your "Unusual API Error Spike" workflow triggered — error rate jumped to 4.7% (normal is ~2%). Top error: rate limit hit.',
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
