import { PrismaClient, Role, EventStatus, TriggerType, NotificationType } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// bcrypt hash of "password12345" with cost 12
const PASSWORD_HASH = '$2b$12$mG.QXtxZvgszMQ2QRF2X3uM18YiAOTuoGJOftI2w/.IHlyiW5Xs7O';

// Deterministic CUID IDs for seed data
const SEED_IDS = {
  userAdmin: 'c0a1b2c3d4e5f6a7b8c9d0e1f',
  userSupport: 'c1b2c3d4e5f6a7b8c9d0e1f2a',
  userSystem: 'system',
  workflow1: 'c1ad5d39cd541163b57e635d3',
  workflow2: 'cf5db21bfb6160f528e7cc0ab',
  workflow3: 'ca72df625589edc70d69c6101',
  workflow4: 'cb07b32d3d3a071ab9e66f957',
  workflow5: 'c40aeccba7bc6eb01cc8c2622',
  workflow6: 'c1840281b8f2afa36d3d49f7c',
  event1: 'cce36863f51b6baf9d16397ff',
  event2: 'cb4e3d14e7519279e6a352f77',
  event3: 'c1441ba5507f9658d9bea29b0',
  event4: 'c7867155e59d4840ba0ddc4e8',
  event5: 'c2e46e678bb4f65f93919deca',
  history1: 'c83a2bef9c15acd3164b288d2',
  history2: 'c044fcf6378df7d92b7229f1d',
  history3: 'cd1cb38d109f087eb24fa9f88',
  comment1: 'c3d574e210bd9e7318776c5e6',
  comment2: 'ce3f2465dc50ed817ce2c11c6',
  snooze1: 'cdb3d1c6e1ba850fcc514bc42',
  notif1: 'c1217fd4cd1987d334aae0589',
  notif2: 'ccb26ee0c333e2ff4a7ed0c8c',
  notif3: 'ca378548d8a17f952a98b36f9',
  notif4: 'c0df684a7ea35896a62f63ef0',
  notif5: 'c00a42c6da1d91443c8f8e02b',
  workflow: (i: number) =>
    `c${createHash('sha256').update(`workflow-${i}`).digest('hex').slice(0, 24)}`,
  event: (i: number) => `c${createHash('sha256').update(`event-${i}`).digest('hex').slice(0, 24)}`,
} as const;

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
      id: SEED_IDS.userAdmin,
      email: 'admin@spexs.dev',
      name: 'Spexs Admin',
      passwordHash: PASSWORD_HASH,
      role: Role.ADMIN,
    },
  });

  const regularUser = await prisma.user.upsert({
    where: { email: 'support@spexs.dev' },
    update: { passwordHash: PASSWORD_HASH },
    create: {
      id: SEED_IDS.userSupport,
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
    recipients: [],
  };
  const workflow1 = await prisma.workflow.upsert({
    where: { id: SEED_IDS.workflow1 },
    update: workflow1Data,
    create: {
      id: SEED_IDS.workflow1,
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
    recipients: [],
  };
  const workflow2 = await prisma.workflow.upsert({
    where: { id: SEED_IDS.workflow2 },
    update: workflow2Data,
    create: {
      id: SEED_IDS.workflow2,
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
    recipients: [],
  };
  const workflow3 = await prisma.workflow.upsert({
    where: { id: SEED_IDS.workflow3 },
    update: workflow3Data,
    create: {
      id: SEED_IDS.workflow3,
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
    recipients: [{ channel: 'IN_APP', destination: regularUser.id }],
  };
  const workflow4 = await prisma.workflow.upsert({
    where: { id: SEED_IDS.workflow4 },
    update: workflow4Data,
    create: {
      id: SEED_IDS.workflow4,
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
    recipients: [],
  };
  const workflow5 = await prisma.workflow.upsert({
    where: { id: SEED_IDS.workflow5 },
    update: workflow5Data,
    create: {
      id: SEED_IDS.workflow5,
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
    where: { id: SEED_IDS.workflow6 },
    update: workflow6Data,
    create: {
      id: SEED_IDS.workflow6,
      name: 'Message Queue Backing Up',
      description:
        'Get alerted when more than 500 messages are waiting to be sent — means your bot cannot keep up with the volume of conversations.',
      isActive: false,
      ...workflow6Data,
      userId: regularUser.id,
    },
  });

  // ---------------------------------------------------------------------------
  // Additional workflows for pagination events (workflows 7-16)
  // Each gets at most one non-RESOLVED event to respect the dedup rule.
  // ---------------------------------------------------------------------------

  const extraWorkflowDefs = [
    {
      name: 'High Template Rejection Rate',
      description: 'Alerts when WhatsApp message templates are being rejected at a high rate.',
      triggerType: TriggerType.THRESHOLD,
      triggerConfig: {
        type: 'THRESHOLD',
        metric: 'wa_template_reject_pct',
        operator: '>',
        value: 10,
      },
      outputMessage:
        '{{value}}% of your message templates are being rejected by Meta — review your templates for policy compliance.',
      isActive: true,
      userId: adminUser.id,
    },
    {
      name: 'Bot Handoff Failures',
      description: 'Detects when the bot fails to hand off conversations to live agents.',
      triggerType: TriggerType.THRESHOLD,
      triggerConfig: {
        type: 'THRESHOLD',
        metric: 'wa_handoff_failure_count',
        operator: '>=',
        value: 5,
      },
      outputMessage:
        '{{value}} handoff attempts failed — users are stuck without a live agent. Check the escalation flow.',
      isActive: true,
      userId: adminUser.id,
    },
    {
      name: 'Webhook Delivery Latency',
      description: 'Monitors webhook callback latency from WhatsApp Cloud API.',
      triggerType: TriggerType.THRESHOLD,
      triggerConfig: {
        type: 'THRESHOLD',
        metric: 'wa_webhook_latency_ms',
        operator: '>',
        value: 3000,
      },
      outputMessage:
        'Webhook callbacks are taking {{value}}ms — your server may be under load or the network is congested.',
      isActive: true,
      userId: regularUser.id,
    },
    {
      name: 'Session Expiry Spike',
      description:
        'Alerts when an unusual number of WhatsApp 24h sessions expire before resolution.',
      triggerType: TriggerType.VARIANCE,
      triggerConfig: { type: 'VARIANCE', baseValue: 8, deviationPercentage: 50 },
      outputMessage:
        'Session expiry rate jumped to {{value}}% — users are not getting responses within the 24h window.',
      isActive: true,
      userId: adminUser.id,
    },
    {
      name: 'Media Upload Failures',
      description: 'Detects failures in uploading images and documents via WhatsApp.',
      triggerType: TriggerType.THRESHOLD,
      triggerConfig: {
        type: 'THRESHOLD',
        metric: 'wa_media_upload_errors',
        operator: '>=',
        value: 10,
      },
      outputMessage: '{{value}} media uploads failed — check file sizes and supported formats.',
      isActive: true,
      userId: adminUser.id,
    },
    {
      name: 'Conversation Volume Surge',
      description: 'Flags unusual spikes in incoming conversation volume.',
      triggerType: TriggerType.VARIANCE,
      triggerConfig: { type: 'VARIANCE', baseValue: 200, deviationPercentage: 60 },
      outputMessage:
        'Incoming conversations surged to {{value}} — your bot may need scaling or a queue.',
      isActive: true,
      userId: regularUser.id,
    },
    {
      name: 'Opt-Out Rate Climbing',
      description:
        'Alerts when users are opting out of WhatsApp notifications at an elevated rate.',
      triggerType: TriggerType.THRESHOLD,
      triggerConfig: { type: 'THRESHOLD', metric: 'wa_optout_pct', operator: '>', value: 3 },
      outputMessage:
        '{{value}}% of users opted out — review message frequency and content relevance.',
      isActive: true,
      userId: adminUser.id,
    },
    {
      name: 'Read Receipt Drop',
      description: 'Monitors the percentage of messages that are read by recipients.',
      triggerType: TriggerType.THRESHOLD,
      triggerConfig: { type: 'THRESHOLD', metric: 'wa_read_receipt_pct', operator: '<', value: 30 },
      outputMessage:
        'Only {{value}}% of messages are being read — check if you are sending at the right time or the content is relevant.',
      isActive: true,
      userId: adminUser.id,
    },
    {
      name: 'Interactive Button Timeout',
      description:
        'Detects when interactive message buttons are not being pressed within expected time.',
      triggerType: TriggerType.THRESHOLD,
      triggerConfig: {
        type: 'THRESHOLD',
        metric: 'wa_button_timeout_pct',
        operator: '>',
        value: 25,
      },
      outputMessage:
        '{{value}}% of interactive buttons timed out — users may not understand the options presented.',
      isActive: true,
      userId: regularUser.id,
    },
    {
      name: 'Daily Spend Limit Approach',
      description:
        'Warns when WhatsApp Business API daily spend is approaching the configured limit.',
      triggerType: TriggerType.THRESHOLD,
      triggerConfig: {
        type: 'THRESHOLD',
        metric: 'wa_daily_spend_usd',
        operator: '>=',
        value: 450,
      },
      outputMessage:
        'Daily spend reached ${{value}} — you are approaching the $500 limit. Conversations may be throttled soon.',
      isActive: false,
      userId: adminUser.id,
    },
  ];

  const extraWorkflows = [];
  for (let i = 0; i < extraWorkflowDefs.length; i++) {
    const def = extraWorkflowDefs[i];
    const wfId = SEED_IDS.workflow(i + 7);
    const wf = await prisma.workflow.upsert({
      where: { id: wfId },
      update: {
        triggerType: def.triggerType,
        triggerConfig: def.triggerConfig,
        outputMessage: def.outputMessage,
        recipients: [],
      },
      create: {
        id: wfId,
        name: def.name,
        description: def.description,
        isActive: def.isActive,
        triggerType: def.triggerType,
        triggerConfig: def.triggerConfig,
        outputMessage: def.outputMessage,
        recipients: [],
        userId: def.userId,
      },
    });
    extraWorkflows.push(wf);
  }

  // ---------------------------------------------------------------------------
  // Events — WhatsApp Chatbot Incidents
  //
  // RULE: At most ONE non-RESOLVED (OPEN or SNOOZED) event per workflow.
  // ---------------------------------------------------------------------------

  const event1 = await prisma.event.upsert({
    where: { id: SEED_IDS.event1 },
    update: {},
    create: {
      id: SEED_IDS.event1,
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
    where: { id: SEED_IDS.event2 },
    update: {},
    create: {
      id: SEED_IDS.event2,
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
    where: { id: SEED_IDS.event3 },
    update: {},
    create: {
      id: SEED_IDS.event3,
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
    where: { id: SEED_IDS.event4 },
    update: {},
    create: {
      id: SEED_IDS.event4,
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
    where: { id: SEED_IDS.event5 },
    update: {},
    create: {
      id: SEED_IDS.event5,
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

  // ---------------------------------------------------------------------------
  // Pagination events (events 6-30)
  //
  // We spread events across ALL 16 workflows (6 core + 10 extra).
  // Each workflow gets at most ONE non-RESOLVED event across the entire seed.
  //
  // Core workflows 1-5 already have a non-RESOLVED event above, so pagination
  // events for those are always RESOLVED. Workflow 6 is inactive so we allow
  // one OPEN event for it. Extra workflows (7-16) each get at most one
  // OPEN or SNOOZED event.
  // ---------------------------------------------------------------------------

  const allWorkflows = [
    workflow1,
    workflow2,
    workflow3,
    workflow4,
    workflow5,
    workflow6,
    ...extraWorkflows,
  ];

  // Track which workflows already have a non-resolved event from the named events above
  const hasUnresolved = new Set([workflow1.id, workflow3.id, workflow4.id, workflow5.id]);

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

  // Desired statuses per event — we'll override to RESOLVED when necessary
  const desiredStatuses = [
    EventStatus.OPEN,
    EventStatus.RESOLVED,
    EventStatus.SNOOZED,
    EventStatus.RESOLVED,
    EventStatus.OPEN,
    EventStatus.RESOLVED,
    EventStatus.SNOOZED,
    EventStatus.RESOLVED,
    EventStatus.OPEN,
    EventStatus.RESOLVED,
    EventStatus.RESOLVED,
    EventStatus.OPEN,
    EventStatus.RESOLVED,
    EventStatus.SNOOZED,
    EventStatus.RESOLVED,
    EventStatus.OPEN,
    EventStatus.RESOLVED,
    EventStatus.RESOLVED,
    EventStatus.RESOLVED,
    EventStatus.OPEN,
    EventStatus.RESOLVED,
    EventStatus.SNOOZED,
    EventStatus.RESOLVED,
    EventStatus.RESOLVED,
    EventStatus.RESOLVED,
  ];

  for (let i = 6; i <= 30; i++) {
    const scenario = scenarios[(i - 6) % scenarios.length];
    const workflow = allWorkflows[i % allWorkflows.length];

    // Determine status: if this workflow already has an unresolved event, force RESOLVED
    let status = desiredStatuses[i - 6] ?? EventStatus.RESOLVED;
    if (status !== EventStatus.RESOLVED && hasUnresolved.has(workflow.id)) {
      status = EventStatus.RESOLVED;
    }

    // Mark this workflow as having an unresolved event
    if (status !== EventStatus.RESOLVED) {
      hasUnresolved.add(workflow.id);
    }

    const eventId = SEED_IDS.event(i);
    await prisma.event.upsert({
      where: { id: eventId },
      update: {},
      create: {
        id: eventId,
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
    where: { id: SEED_IDS.history1 },
    update: {},
    create: {
      id: SEED_IDS.history1,
      action: 'CREATED',
      eventId: event1.id,
      userId: adminUser.id,
    },
  });

  await prisma.eventHistory.upsert({
    where: { id: SEED_IDS.history2 },
    update: {},
    create: {
      id: SEED_IDS.history2,
      action: 'RESOLVED',
      eventId: event2.id,
      userId: adminUser.id,
    },
  });

  await prisma.eventHistory.upsert({
    where: { id: SEED_IDS.history3 },
    update: {},
    create: {
      id: SEED_IDS.history3,
      action: 'SNOOZED',
      eventId: event4.id,
      userId: regularUser.id,
    },
  });

  // ---------------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------------

  await prisma.comment.upsert({
    where: { id: SEED_IDS.comment1 },
    update: {},
    create: {
      id: SEED_IDS.comment1,
      content:
        'Looking into this — the bot is slow only in LATAM, so it might be a Meta API routing issue in that region.',
      eventId: event1.id,
      userId: adminUser.id,
    },
  });

  await prisma.comment.upsert({
    where: { id: SEED_IDS.comment2 },
    update: {},
    create: {
      id: SEED_IDS.comment2,
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
      id: SEED_IDS.snooze1,
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
    where: { id: SEED_IDS.notif1 },
    update: {},
    create: {
      id: SEED_IDS.notif1,
      type: NotificationType.EVENT_TRIGGERED,
      title: 'Bot replying slow in LATAM region',
      body: 'Your "Slow Bot Replies" workflow triggered — response time hit 7200ms (limit is 5000ms).',
      isRead: false,
      metadata: { eventId: SEED_IDS.event1, workflowId: SEED_IDS.workflow1 },
      userId: adminUser.id,
    },
  });

  await prisma.notification.upsert({
    where: { id: SEED_IDS.notif2 },
    update: {},
    create: {
      id: SEED_IDS.notif2,
      type: NotificationType.EVENT_RESOLVED,
      title: 'Resolved: Order confirmation messages not reaching users',
      body: 'The delivery issue has been resolved — the template was re-approved and messages are going through again.',
      isRead: true,
      metadata: { eventId: SEED_IDS.event2, workflowId: SEED_IDS.workflow2 },
      userId: adminUser.id,
    },
  });

  await prisma.notification.upsert({
    where: { id: SEED_IDS.notif3 },
    update: {},
    create: {
      id: SEED_IDS.notif3,
      type: NotificationType.EVENT_SNOOZED,
      title: 'Snoozed: Bad ratings on billing questions',
      body: 'Snoozed for 24 hours — the billing FAQ answers are being rewritten and go live tomorrow.',
      isRead: false,
      metadata: { eventId: SEED_IDS.event4, workflowId: SEED_IDS.workflow4 },
      userId: regularUser.id,
    },
  });

  await prisma.notification.upsert({
    where: { id: SEED_IDS.notif4 },
    update: {},
    create: {
      id: SEED_IDS.notif4,
      type: NotificationType.EVENT_TRIGGERED,
      title: 'Users leaving during onboarding flow',
      body: 'Your "Users Dropping Off Conversations" workflow triggered — drop-off rate jumped to 23.5% (baseline is 15%).',
      isRead: false,
      metadata: { eventId: SEED_IDS.event3, workflowId: SEED_IDS.workflow3 },
      userId: adminUser.id,
    },
  });

  await prisma.notification.upsert({
    where: { id: SEED_IDS.notif5 },
    update: {},
    create: {
      id: SEED_IDS.notif5,
      type: NotificationType.EVENT_TRIGGERED,
      title: 'WhatsApp API errors spiking — possible rate limit',
      body: 'Your "Unusual API Error Spike" workflow triggered — error rate jumped to 4.7% (normal is ~2%). Top error: rate limit hit.',
      isRead: false,
      metadata: { eventId: SEED_IDS.event5, workflowId: SEED_IDS.workflow5 },
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
