import { z } from "zod";


import {
  addGroupMember,
  createOrGetChat,
  createGroupChat,
  promoteGroupAdmin,
  removeGroupMember,
} from "../services/chat.service";



import type { AsyncController } from "../types";



const createChatSchema = z.object({
  userAId: z.string().trim().min(1),
  userBId: z.string().trim().min(1),
});




export const createChat: AsyncController = async (request, response) => {
  const { userAId, userBId } = createChatSchema.parse(request.body);
  const chat = await createOrGetChat(userAId, userBId);
  console.log("Chat created or retrieved:", chat);
  response.status(200).json({ chatId: chat.id });
};

const chatIdSchema = z.string().uuid();
console.log("Chat ID schema created:", chatIdSchema)
const userIdSchema = z.string().trim().min(1);




export const createGroup: AsyncController = async (request, response) => {
  const { creatorId, memberIds, name } = z
    .object({
      creatorId: userIdSchema,
      memberIds: z.array(userIdSchema).min(2).max(100),
      name: z.string().trim().min(1).max(100).optional(),
    })
    .parse(request.body);
  const chat = await createGroupChat(creatorId, memberIds, name);
  console.log("Group chat created:", chat);
  response.status(201).json({
    chatId: chat.id,
    isGroup: chat.isGroup,
    name: chat.name,
    memberIds: chat.members.map((member) => member.userId),
  });
};





export const addMember: AsyncController = async (request, response) => {
  const chatId = chatIdSchema.parse(request.params.chatId);
  const { actorId, userId } = z
    .object({ actorId: userIdSchema, userId: userIdSchema })
    .parse(request.body);
  const result = await addGroupMember(chatId, actorId, userId);
  response.status(201).json(result);
};



console.log("User ID schema created:", userIdSchema)

export const promoteMember: AsyncController = async (request, response) => {
  const chatId = chatIdSchema.parse(request.params.chatId);
  const { actorId, userId } = z
    .object({ actorId: userIdSchema, userId: userIdSchema })
    .parse(request.body);
  const result = await promoteGroupAdmin(chatId, actorId, userId);
  response.status(200).json(result);
};

console.log("Chat ID schema created:", chatIdSchema)

export const removeMember: AsyncController = async (request, response) => {
  const chatId = chatIdSchema.parse(request.params.chatId);
  const userId = userIdSchema.parse(request.params.userId);
  const { actorId } = z.object({ actorId: userIdSchema }).parse(request.body);
  const result = await removeGroupMember(chatId, actorId, userId);
  response.status(200).json(result);
};
