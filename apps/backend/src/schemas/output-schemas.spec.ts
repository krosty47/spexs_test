import {
  workflowOutputSchema,
  workflowListOutputSchema,
  workflowDetailOutputSchema,
  simulateWorkflowOutputSchema,
  eventOutputSchema,
  eventDetailOutputSchema,
  authOutputSchema,
  trpcUserSchema,
  notificationSchema,
  notificationListOutputSchema,
  markAllAsReadOutputSchema,
  unreadCountOutputSchema,
  addCommentSchema,
} from '@workflow-manager/shared';

describe('Output Schema Validation', () => {
  // --- Workflow Schemas ---

  describe('workflowOutputSchema', () => {
    const validWorkflow = {
      id: 'wf-1',
      name: 'Test Workflow',
      description: 'A description',
      isActive: true,
      triggerType: 'THRESHOLD' as const,
      triggerConfig: { type: 'THRESHOLD', metric: 'cpu', operator: '>', value: 90 },
      outputMessage: 'Alert!',
      recipients: [{ channel: 'EMAIL', destination: 'test@test.com' }],
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'user-1',
    };

    it('should validate a valid Prisma Workflow shape with Date objects', () => {
      const result = workflowOutputSchema.safeParse(validWorkflow);
      expect(result.success).toBe(true);
    });

    it('should validate with ISO string dates (coercion)', () => {
      const result = workflowOutputSchema.safeParse({
        ...validWorkflow,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid shape (missing required field)', () => {
      const { name: _, ...incomplete } = validWorkflow;
      const result = workflowOutputSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it('should accept null triggerConfig', () => {
      const result = workflowOutputSchema.safeParse({
        ...validWorkflow,
        triggerConfig: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept null recipients', () => {
      const result = workflowOutputSchema.safeParse({
        ...validWorkflow,
        recipients: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty recipients array', () => {
      const result = workflowOutputSchema.safeParse({
        ...validWorkflow,
        recipients: [],
      });
      expect(result.success).toBe(true);
    });

    it('should accept null description', () => {
      const result = workflowOutputSchema.safeParse({
        ...validWorkflow,
        description: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('workflowListOutputSchema', () => {
    it('should validate paginated response', () => {
      const result = workflowListOutputSchema.safeParse({
        data: [
          {
            id: 'wf-1',
            name: 'Workflow',
            description: null,
            isActive: false,
            triggerType: null,
            triggerConfig: null,
            outputMessage: null,
            recipients: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: 'user-1',
            _count: { events: 3 },
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('workflowDetailOutputSchema', () => {
    it('should require events and _count fields', () => {
      const result = workflowDetailOutputSchema.safeParse({
        id: 'wf-1',
        name: 'Workflow',
        description: null,
        isActive: false,
        triggerType: null,
        triggerConfig: null,
        outputMessage: null,
        recipients: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-1',
        events: [
          {
            id: 'ev-1',
            title: 'Event 1',
            payload: { key: 'value' },
            status: 'OPEN',
            createdAt: new Date(),
            updatedAt: new Date(),
            workflowId: 'wf-1',
            resolvedAt: null,
            resolvedById: null,
          },
        ],
        _count: { events: 1 },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('simulateWorkflowOutputSchema', () => {
    it('should validate simulation result', () => {
      const result = simulateWorkflowOutputSchema.safeParse({
        triggered: true,
        message: 'Alert triggered',
        details: 'cpu > 90',
        dryRun: false,
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional alreadyOpen', () => {
      const result = simulateWorkflowOutputSchema.safeParse({
        triggered: true,
        message: 'Alert triggered',
        details: 'cpu > 90',
        dryRun: false,
        alreadyOpen: true,
      });
      expect(result.success).toBe(true);
    });
  });

  // --- Event Schemas ---

  describe('eventOutputSchema', () => {
    it('should validate a valid event shape', () => {
      const result = eventOutputSchema.safeParse({
        id: 'ev-1',
        title: 'Test Event',
        payload: { metric: 95 },
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date(),
        workflowId: 'wf-1',
        resolvedAt: null,
        resolvedById: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('eventDetailOutputSchema', () => {
    it('should validate nested comments, snooze, and history', () => {
      const result = eventDetailOutputSchema.safeParse({
        id: 'ev-1',
        title: 'Test Event',
        payload: {},
        status: 'SNOOZED',
        createdAt: new Date(),
        updatedAt: new Date(),
        workflowId: 'wf-1',
        resolvedAt: null,
        resolvedById: null,
        workflow: { id: 'wf-1', name: 'My Workflow' },
        comments: [
          {
            id: 'c-1',
            content: 'A comment',
            createdAt: new Date(),
            updatedAt: new Date(),
            eventId: 'ev-1',
            userId: 'user-1',
            user: { id: 'user-1', name: 'Admin' },
          },
        ],
        snooze: {
          id: 's-1',
          until: new Date(),
          reason: 'Investigating',
          createdAt: new Date(),
          eventId: 'ev-1',
          userId: 'user-1',
        },
        history: [
          {
            id: 'h-1',
            action: 'TRIGGERED',
            createdAt: new Date(),
            eventId: 'ev-1',
            userId: 'user-1',
            user: { id: 'user-1', name: 'Admin' },
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  // --- Auth Schemas ---

  describe('authOutputSchema', () => {
    it('should validate login response with tokens and user', () => {
      const result = authOutputSchema.safeParse({
        accessToken: 'jwt-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-1',
          email: 'test@test.com',
          name: 'Test User',
          role: 'USER',
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('trpcUserSchema', () => {
    it('should validate context user shape', () => {
      const result = trpcUserSchema.safeParse({
        id: 'user-1',
        email: 'test@test.com',
        role: 'USER',
      });
      expect(result.success).toBe(true);
    });
  });

  // --- Notification Schemas ---

  describe('notificationSchema', () => {
    it('should validate with Date objects (coerced)', () => {
      const result = notificationSchema.safeParse({
        id: 'n-1',
        type: 'EVENT_TRIGGERED',
        title: 'Event triggered',
        body: 'A new event was triggered.',
        isRead: false,
        metadata: { eventId: 'ev-1', workflowId: 'wf-1' },
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-1',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with ISO string dates', () => {
      const result = notificationSchema.safeParse({
        id: 'n-1',
        type: 'EVENT_TRIGGERED',
        title: 'Event triggered',
        body: 'A new event was triggered.',
        isRead: false,
        metadata: { eventId: 'ev-1', workflowId: 'wf-1' },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        userId: 'user-1',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('notificationListOutputSchema', () => {
    it('should validate paginated notification list', () => {
      const result = notificationListOutputSchema.safeParse({
        data: [
          {
            id: 'n-1',
            type: 'EVENT_TRIGGERED',
            title: 'Test',
            body: 'Body',
            isRead: false,
            metadata: { eventId: 'ev-1', workflowId: 'wf-1' },
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: 'user-1',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('markAllAsReadOutputSchema', () => {
    it('should validate batch count', () => {
      const result = markAllAsReadOutputSchema.safeParse({ count: 5 });
      expect(result.success).toBe(true);
    });
  });

  describe('unreadCountOutputSchema', () => {
    it('should validate unread count', () => {
      const result = unreadCountOutputSchema.safeParse({ count: 3 });
      expect(result.success).toBe(true);
    });
  });

  // --- Comment Sanitization ---

  describe('addCommentSchema content sanitization', () => {
    it('should trim whitespace from content', () => {
      const result = addCommentSchema.parse({
        eventId: 'ev-1',
        content: '  Hello world  ',
      });
      expect(result.content).toBe('Hello world');
    });

    it('should strip HTML tags from content', () => {
      const result = addCommentSchema.parse({
        eventId: 'ev-1',
        content: 'Hello <script>alert("xss")</script>world',
      });
      expect(result.content).toBe('Hello alert("xss")world');
    });

    it('should reject empty string after trim', () => {
      const result = addCommentSchema.safeParse({
        eventId: 'ev-1',
        content: '   ',
      });
      expect(result.success).toBe(false);
    });

    it('should reject HTML-only content that becomes empty after stripping', () => {
      const result = addCommentSchema.safeParse({
        eventId: 'ev-1',
        content: '<b></b><i></i>',
      });
      expect(result.success).toBe(false);
    });

    it('should preserve normal text without HTML', () => {
      const result = addCommentSchema.parse({
        eventId: 'ev-1',
        content: 'This is a normal comment with some punctuation! And numbers: 123.',
      });
      expect(result.content).toBe(
        'This is a normal comment with some punctuation! And numbers: 123.',
      );
    });
  });
});
