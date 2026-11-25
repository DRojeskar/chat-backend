import { z } from "zod";
import { listChatsForUser } from "../services/chat.service";
import type { AsyncController } from "../types";

export const listUserChats: AsyncController = async (request, response) => {
  const userId = z.string().trim().min(1).parse(request.params.userId);
  const chats = await listChatsForUser(userId);
  response.status(200).json({ chats });
};
