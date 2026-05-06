import type { Event } from "@prisma/client";

export type AppEventType = "PAGE_VIEW";

export interface CreateEventInput {
  type: AppEventType;
  path: string;
  userId?: string;
}

export interface IEventRepository {
  createEvent(input: CreateEventInput): Promise<Event>;
  countEvents(params: { type?: AppEventType; since?: Date }): Promise<number>;
}

