import { ChatMemberRole, Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { HttpError } from "../types";

export async function createOrGetChat(userAId: string, userBId: string) {
  if (userAId === userBId) {
    throw new HttpError(400, "A chat requires two different users");
  }




  
  const [firstUserId, secondUserId] = [userAId, userBId].sort();
  const existingChat = await prisma.chat.findFirst({
    where: { userAId: firstUserId, userBId: secondUserId, isGroup: false },
  });

  if (existingChat) {
    return existingChat;
  }

  try {
    return await prisma.chat.create({
      data: {
        userAId: firstUserId,
        userBId: secondUserId,
        members: {
          create: [
            { userId: firstUserId, role: ChatMemberRole.ADMIN },
            { userId: secondUserId },
          ],
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const chat = await prisma.chat.findFirst({
          where: {
            userAId: firstUserId,
            userBId: secondUserId,
            isGroup: false,
          },
        });
        if (chat) {
          return chat;
        }
      }

      if (error.code === "P2003") {
        throw new HttpError(404, "One or both users do not exist");
      }
    }

    throw error;
  }
}

export async function createGroupChat(
  creatorId: string,
  memberIds: string[],
  name?: string,
) {
  const uniqueMemberIds = [...new Set([creatorId, ...memberIds])];
  if (uniqueMemberIds.length < 3) {
    throw new HttpError(400, "A group chat must have at least three members");
  }

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueMemberIds } },
    select: { id: true },
  });
  if (users.length !== uniqueMemberIds.length) {
    throw new HttpError(404, "One or more users do not exist");
  }
  if (uniqueMemberIds.length > 100) {
    throw new HttpError(400, "A group chat cannot have more than 100 members");
  }

  try {
    return await prisma.chat.create({
      data: {
        userAId: null,
        userBId: null,
        isGroup: true,
        ...(name ? { name } : {}),
        members: {
          create: uniqueMemberIds.map((userId) => ({
            userId,
            role:
              userId === creatorId ? ChatMemberRole.ADMIN : ChatMemberRole.MEMBER,
          })),
        },
      },
      include: { members: { select: { userId: true, role: true } } },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new HttpError(404, "One or more users do not exist");
    }
    throw error;
  }
}

export async function getChat(chatId: string) {
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });

  if (!chat) {
    throw new HttpError(404, "Chat not found");
  }

  return chat;
}

export async function getChatForUser(chatId: string, userId: string) {
  const chat = await getChat(chatId);
  const membership = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
  });
  if (!membership) {
    throw new HttpError(403, "User is not a member of this chat");
  }

  return chat;
}

export async function listChatsForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const memberships = await prisma.chatMember.findMany({
    where: { userId },
    include: { chat: { include: { members: { select: { userId: true } } } } },
    orderBy: { chat: { updatedAt: "desc" } },
  });

  return memberships.map(({ chat }) => ({
    id: chat.id,
    memberIds: chat.members.map((member) => member.userId),
    isGroup: chat.isGroup,
    name: chat.name,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  }));
}

async function requireGroupAdmin(chatId: string, actorId: string) {
  const chat = await getChatForUser(chatId, actorId);
  if (!chat.isGroup) {
    throw new HttpError(400, "Member management is only available for group chats");
  }

  const actor = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId: actorId } },
  });
  if (actor?.role !== ChatMemberRole.ADMIN) {
    throw new HttpError(403, "Only group admins can manage members");
  }
  return chat;
}

export async function addGroupMember(
  chatId: string,
  actorId: string,
  userId: string,
) {
  await requireGroupAdmin(chatId, actorId);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  try {
    await prisma.chatMember.create({ data: { chatId, userId } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(409, "User is already a member of this chat");
    }
    throw error;
  }

  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });
  return { chatId, userId, added: true };
}

export async function promoteGroupAdmin(
  chatId: string,
  actorId: string,
  userId: string,
) {
  await requireGroupAdmin(chatId, actorId);
  const membership = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
  });
  if (!membership) {
    throw new HttpError(404, "User is not a member of this chat");
  }

  await prisma.chatMember.update({
    where: { chatId_userId: { chatId, userId } },
    data: { role: ChatMemberRole.ADMIN },
  });
  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });
  return { chatId, userId, role: ChatMemberRole.ADMIN };
}

export async function removeGroupMember(
  chatId: string,
  actorId: string,
  userId: string,
) {
  await requireGroupAdmin(chatId, actorId);
  const membership = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
  });
  if (!membership) {
    throw new HttpError(404, "User is not a member of this chat");
  }

  if (membership.role === ChatMemberRole.ADMIN) {
    const adminCount = await prisma.chatMember.count({
      where: { chatId, role: ChatMemberRole.ADMIN },
    });
    if (adminCount <= 1) {
      throw new HttpError(400, "Promote another admin before removing the last admin");
    }
  }

  await prisma.chatMember.delete({
    where: { chatId_userId: { chatId, userId } },
  });
  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });
  return { chatId, userId, removed: true };
}
