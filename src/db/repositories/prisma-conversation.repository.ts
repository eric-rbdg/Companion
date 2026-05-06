import type { Message, MessageRole, User } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { IConversationRepository } from "./conversation.repository.js";

export class PrismaConversationRepository implements IConversationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findOrCreateUserByPhoneHash(phoneHash: string): Promise<User> {
    return this.prisma.user.upsert({
      where: { phoneNumber: phoneHash },
      create: { phoneNumber: phoneHash },
      update: {},
    });
  }

  async setEncryptedPhoneForUser(params: {
    userId: string;
    phoneNumberEnc: string;
    phoneNumberEncKeyId?: string;
  }): Promise<void> {
    await this.prisma.user.update({
      where: { id: params.userId },
      data: {
        phoneNumberEnc: params.phoneNumberEnc,
        phoneNumberEncKeyId: params.phoneNumberEncKeyId,
      },
    });
  }

  async getRecentMessages(userId: string, limit: number): Promise<Message[]> {
    const rows = await this.prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.reverse();
  }

  async saveMessage(
    userId: string,
    role: MessageRole,
    content: string,
  ): Promise<void> {
    await this.prisma.message.create({
      data: { userId, role, content },
    });
  }

  async setOptedOut(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isOptedOut: true },
    });
  }

  async setOptedIn(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isOptedOut: false },
    });
  }

  async clearConversation(userId: string): Promise<void> {
    await this.prisma.message.deleteMany({
      where: { userId },
    });
  }
}
