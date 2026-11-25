import { Router } from "express";
import {
  deleteChatMessage,
  editChatMessage,
  listChatMessages,
  markChatMessageRead,
  sendChatMessage,
  updateChatLastSeen,
} from "../controllers/message.controller";
import {
  addMember,
  createChat,
  createGroup,
  promoteMember,
  removeMember,
} from "../controllers/chat.controller";

const router = Router();

router.post("/create", createChat);


router.post("/group/create", createGroup);


router.post("/:chatId/message/send", sendChatMessage);


router.patch("/:chatId/message/:messageId", editChatMessage);


router.delete("/:chatId/message/:messageId", deleteChatMessage);


router.get("/:chatId/messages", listChatMessages);


router.post("/:chatId/message/:messageId/read", markChatMessageRead);
router.post("/:chatId/lastseen", updateChatLastSeen);
router.post("/:chatId/members", addMember);
router.post("/:chatId/admins", promoteMember);
router.delete("/:chatId/members/:userId", removeMember);

export default router;
