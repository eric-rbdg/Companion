import type { Message, MessageRole, User } from "@prisma/client";

/**
 * Repository abstraction so persistence can be swapped (e.g. Dynamo, another ORM)
 * without changing ConversationService.
 */
export interface IConversationRepository {
  findOrCreateUserByPhoneHash(phoneHash: string): Promise<User>;
  setEncryptedPhoneForUser(params: {
    userId: string;
    phoneNumberEnc: string;
    phoneNumberEncKeyId?: string;
  }): Promise<void>;
  getRecentMessages(userId: string, limit: number): Promise<Message[]>;
  saveMessage(userId: string, role: MessageRole, content: string): Promise<void>;
  setOptedOut(userId: string): Promise<void>;
  setOptedIn(userId: string): Promise<void>;
  clearConversation(userId: string): Promise<void>;
}
