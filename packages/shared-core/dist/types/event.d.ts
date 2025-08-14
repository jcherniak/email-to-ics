import { z } from 'zod';
export declare const EventDataSchema: z.ZodObject<{
    uid: z.ZodOptional<z.ZodString>;
    summary: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    htmlDescription: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    dtstart: z.ZodEffects<z.ZodString, string, string>;
    dtend: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    timezone: z.ZodDefault<z.ZodString>;
    isAllDay: z.ZodDefault<z.ZodBoolean>;
    status: z.ZodDefault<z.ZodEnum<["confirmed", "tentative"]>>;
    url: z.ZodOptional<z.ZodString>;
    organizer: z.ZodOptional<z.ZodObject<{
        email: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        name?: string | undefined;
    }, {
        email: string;
        name?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    summary: string;
    dtstart: string;
    status: "confirmed" | "tentative";
    timezone: string;
    isAllDay: boolean;
    uid?: string | undefined;
    description?: string | undefined;
    htmlDescription?: string | undefined;
    location?: string | undefined;
    dtend?: string | undefined;
    url?: string | undefined;
    organizer?: {
        email: string;
        name?: string | undefined;
    } | undefined;
}, {
    summary: string;
    dtstart: string;
    uid?: string | undefined;
    description?: string | undefined;
    htmlDescription?: string | undefined;
    location?: string | undefined;
    status?: "confirmed" | "tentative" | undefined;
    dtend?: string | undefined;
    timezone?: string | undefined;
    isAllDay?: boolean | undefined;
    url?: string | undefined;
    organizer?: {
        email: string;
        name?: string | undefined;
    } | undefined;
}>;
export type EventData = z.infer<typeof EventDataSchema>;
export declare const MultiDayEventsSchema: z.ZodArray<z.ZodObject<{
    uid: z.ZodOptional<z.ZodString>;
    summary: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    htmlDescription: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    dtstart: z.ZodEffects<z.ZodString, string, string>;
    dtend: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    timezone: z.ZodDefault<z.ZodString>;
    isAllDay: z.ZodDefault<z.ZodBoolean>;
    status: z.ZodDefault<z.ZodEnum<["confirmed", "tentative"]>>;
    url: z.ZodOptional<z.ZodString>;
    organizer: z.ZodOptional<z.ZodObject<{
        email: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        name?: string | undefined;
    }, {
        email: string;
        name?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    summary: string;
    dtstart: string;
    status: "confirmed" | "tentative";
    timezone: string;
    isAllDay: boolean;
    uid?: string | undefined;
    description?: string | undefined;
    htmlDescription?: string | undefined;
    location?: string | undefined;
    dtend?: string | undefined;
    url?: string | undefined;
    organizer?: {
        email: string;
        name?: string | undefined;
    } | undefined;
}, {
    summary: string;
    dtstart: string;
    uid?: string | undefined;
    description?: string | undefined;
    htmlDescription?: string | undefined;
    location?: string | undefined;
    status?: "confirmed" | "tentative" | undefined;
    dtend?: string | undefined;
    timezone?: string | undefined;
    isAllDay?: boolean | undefined;
    url?: string | undefined;
    organizer?: {
        email: string;
        name?: string | undefined;
    } | undefined;
}>, "many">;
export type MultiDayEvents = z.infer<typeof MultiDayEventsSchema>;
export declare const ParsingInputSchema: z.ZodObject<{
    html: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    screenshot: z.ZodOptional<z.ZodString>;
    source: z.ZodDefault<z.ZodEnum<["email", "webpage", "manual"]>>;
}, "strip", z.ZodTypeAny, {
    source: "email" | "webpage" | "manual";
    url?: string | undefined;
    html?: string | undefined;
    text?: string | undefined;
    screenshot?: string | undefined;
}, {
    url?: string | undefined;
    html?: string | undefined;
    text?: string | undefined;
    screenshot?: string | undefined;
    source?: "email" | "webpage" | "manual" | undefined;
}>;
export type ParsingInput = z.infer<typeof ParsingInputSchema>;
export declare const ExtractionResultSchema: z.ZodObject<{
    events: z.ZodArray<z.ZodObject<{
        uid: z.ZodOptional<z.ZodString>;
        summary: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        htmlDescription: z.ZodOptional<z.ZodString>;
        location: z.ZodOptional<z.ZodString>;
        dtstart: z.ZodEffects<z.ZodString, string, string>;
        dtend: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
        timezone: z.ZodDefault<z.ZodString>;
        isAllDay: z.ZodDefault<z.ZodBoolean>;
        status: z.ZodDefault<z.ZodEnum<["confirmed", "tentative"]>>;
        url: z.ZodOptional<z.ZodString>;
        organizer: z.ZodOptional<z.ZodObject<{
            email: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            email: string;
            name?: string | undefined;
        }, {
            email: string;
            name?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        summary: string;
        dtstart: string;
        status: "confirmed" | "tentative";
        timezone: string;
        isAllDay: boolean;
        uid?: string | undefined;
        description?: string | undefined;
        htmlDescription?: string | undefined;
        location?: string | undefined;
        dtend?: string | undefined;
        url?: string | undefined;
        organizer?: {
            email: string;
            name?: string | undefined;
        } | undefined;
    }, {
        summary: string;
        dtstart: string;
        uid?: string | undefined;
        description?: string | undefined;
        htmlDescription?: string | undefined;
        location?: string | undefined;
        status?: "confirmed" | "tentative" | undefined;
        dtend?: string | undefined;
        timezone?: string | undefined;
        isAllDay?: boolean | undefined;
        url?: string | undefined;
        organizer?: {
            email: string;
            name?: string | undefined;
        } | undefined;
    }>, "many">;
    confidence: z.ZodNumber;
    source: z.ZodString;
    model: z.ZodString;
    timestamp: z.ZodNumber;
    needsReview: z.ZodDefault<z.ZodBoolean>;
    confirmationToken: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    source: string;
    events: {
        summary: string;
        dtstart: string;
        status: "confirmed" | "tentative";
        timezone: string;
        isAllDay: boolean;
        uid?: string | undefined;
        description?: string | undefined;
        htmlDescription?: string | undefined;
        location?: string | undefined;
        dtend?: string | undefined;
        url?: string | undefined;
        organizer?: {
            email: string;
            name?: string | undefined;
        } | undefined;
    }[];
    confidence: number;
    model: string;
    timestamp: number;
    needsReview: boolean;
    confirmationToken?: string | undefined;
}, {
    source: string;
    events: {
        summary: string;
        dtstart: string;
        uid?: string | undefined;
        description?: string | undefined;
        htmlDescription?: string | undefined;
        location?: string | undefined;
        status?: "confirmed" | "tentative" | undefined;
        dtend?: string | undefined;
        timezone?: string | undefined;
        isAllDay?: boolean | undefined;
        url?: string | undefined;
        organizer?: {
            email: string;
            name?: string | undefined;
        } | undefined;
    }[];
    confidence: number;
    model: string;
    timestamp: number;
    needsReview?: boolean | undefined;
    confirmationToken?: string | undefined;
}>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
export declare const IcsConfigSchema: z.ZodObject<{
    method: z.ZodDefault<z.ZodEnum<["PUBLISH", "REQUEST"]>>;
    includeHtmlDescription: z.ZodDefault<z.ZodBoolean>;
    prodId: z.ZodDefault<z.ZodString>;
    timezone: z.ZodDefault<z.ZodString>;
    filename: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    timezone: string;
    method: "PUBLISH" | "REQUEST";
    includeHtmlDescription: boolean;
    prodId: string;
    filename?: string | undefined;
}, {
    timezone?: string | undefined;
    method?: "PUBLISH" | "REQUEST" | undefined;
    includeHtmlDescription?: boolean | undefined;
    prodId?: string | undefined;
    filename?: string | undefined;
}>;
export type IcsConfig = z.infer<typeof IcsConfigSchema>;
