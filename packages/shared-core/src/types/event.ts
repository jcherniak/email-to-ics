import { z } from 'zod';

// Core event data structure - matches PHP IcalGenerator expectations
export const EventDataSchema = z.object({
  uid: z.string().optional(),
  summary: z.string(),
  description: z.string().optional(),
  htmlDescription: z.string().optional(),
  location: z.string().optional(),
  dtstart: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid start date'),
  dtend: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid end date'),
  timezone: z.string().default('America/Los_Angeles'),
  isAllDay: z.boolean().default(false),
  status: z.enum(['confirmed', 'tentative']).default('confirmed'),
  url: z.string().url().optional(),
  organizer: z.object({
    email: z.string().email(),
    name: z.string().optional()
  }).optional()
});

export type EventData = z.infer<typeof EventDataSchema>;

// Multi-day event support (array of events)
export const MultiDayEventsSchema = z.array(EventDataSchema);
export type MultiDayEvents = z.infer<typeof MultiDayEventsSchema>;

// AI parsing input structure
export const ParsingInputSchema = z.object({
  html: z.string().optional(),
  text: z.string().optional(),
  url: z.string().url().optional(),
  screenshot: z.string().optional(), // Base64 data URL
  source: z.enum(['email', 'webpage', 'manual']).default('webpage')
});

export type ParsingInput = z.infer<typeof ParsingInputSchema>;

// AI extraction result
export const ExtractionResultSchema = z.object({
  events: z.array(EventDataSchema),
  confidence: z.number().min(0).max(1),
  source: z.string(),
  model: z.string(),
  timestamp: z.number(),
  needsReview: z.boolean().default(false),
  confirmationToken: z.string().optional()
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

// ICS generation configuration
export const IcsConfigSchema = z.object({
  method: z.enum(['PUBLISH', 'REQUEST']).default('PUBLISH'),
  includeHtmlDescription: z.boolean().default(true),
  prodId: z.string().default('-//Email-to-ICS//Node.js//EN'),
  timezone: z.string().default('America/Los_Angeles'),
  filename: z.string().optional()
});

export type IcsConfig = z.infer<typeof IcsConfigSchema>;