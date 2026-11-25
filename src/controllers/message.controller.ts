import { z } from "zod";


import {
  getMessages,
  markMessageRead,
  sendMessage,
  updateLastSeen,
  editMessage,
  deleteMessage,
} from "../services/message.service";


import type { AsyncController } from "../types";

const chatIdSchema = z.string().uuid();
const userIdSchema = z.string().trim().min(1);

console.log("Chat ID schema created:", chatIdSchema);
console.log("User ID schema created:", userIdSchema);

export const sendChatMessage: AsyncController = async (request, response) => {
  const chatId = chatIdSchema.parse(request.params.chatId);
  const body = z
    .object({
      senderId: userIdSchema,
      text: z.string().trim().min(1).max(5000),
    })
    .parse(request.body);

  const message = await sendMessage(chatId, body.senderId, body.text);
  response.status(201).json(message);
};





export const listChatMessages: AsyncController = async (request, response) => {
  const chatId = chatIdSchema.parse(request.params.chatId);
  const query = z
    .object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      userId: userIdSchema.optional(),
    })
    .parse(request.query);

  const messages = await getMessages(chatId, query.limit, query.userId);
  response.status(200).json({ messages });
};




export const markChatMessageRead: AsyncController = async (request, response) => {
  const chatId = chatIdSchema.parse(request.params.chatId);
  const messageId = z.string().trim().min(1).parse(request.params.messageId);
  const { userId } = z.object({ userId: userIdSchema }).parse(request.body);

  const receipt = await markMessageRead(chatId, messageId, userId);
  console.log("Message marked as read:", receipt);
  response.status(200).json(receipt);
};

export const updateChatLastSeen: AsyncController = async (request, response) => {
  const chatId = chatIdSchema.parse(request.params.chatId);
  const { userId, messageId } = z
    .object({ userId: userIdSchema, messageId: z.string().trim().min(1) })
    .parse(request.body);

  const lastSeen = await updateLastSeen(chatId, userId, messageId);
  response.status(200).json(lastSeen);
};



export const editChatMessage: AsyncController = async (request, response) => {
  const chatId = chatIdSchema.parse(request.params.chatId);
  const messageId = z.string().trim().min(1).parse(request.params.messageId);
  const { userId, text } = z
    .object({
      userId: userIdSchema,
      text: z.string().trim().min(1).max(5000),
    })
    .parse(request.body);
  const message = await editMessage(chatId, messageId, userId, text);
  response.status(200).json(message);
};


export const deleteChatMessage: AsyncController = async (request, response) => {
  const chatId = chatIdSchema.parse(request.params.chatId);
  const messageId = z.string().trim().min(1).parse(request.params.messageId);
  const { userId } = z.object({ userId: userIdSchema }).parse(request.body);
  const message = await deleteMessage(chatId, messageId, userId);
  response.status(200).json(message);
};
