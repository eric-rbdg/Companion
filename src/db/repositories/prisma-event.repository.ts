import { EventType } from "@prisma/client";
import type { PrismaClient, Event } from "@prisma/client";
import type { CreateEventInput, IEventRepository } from "./event.repository.js";

export class PrismaEventRepository implements IEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createEvent(input: CreateEventInput): Promise<Event> {
    return this.prisma.event.create({
      data: {
        type: input.type === "PAGE_VIEW" ? EventType.PAGE_VIEW : EventType.PAGE_VIEW,
        path: input.path,
        userId: input.userId,
      },
    });
  }

  async countEvents(params: { type?: "PAGE_VIEW"; since?: Date }): Promise<number> {
    return this.prisma.event.count({
      where: {
        ...(params.type ? { type: EventType.PAGE_VIEW } : {}),
        ...(params.since ? { createdAt: { gte: params.since } } : {}),
      },
    });
  }
}

