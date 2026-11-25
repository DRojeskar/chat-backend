import { FieldPath, FieldValue, Timestamp } from "firebase-admin/firestore";
import { firestore } from "../config/firebase";
import { getChat, getChatForUser } from "./chat.service";
import { HttpError } from "../types";

const messagesCollection = (chatId: string) =>
  firestore.collection("chats").doc(chatId).collection("messages");

export async function sendMessage(chatId: string, senderId: string, text: string) {
  await getChatForUser(chatId, senderId);

  const createdAt = Timestamp.now();
  const messageRef = messagesCollection(chatId).doc();
  await messageRef.create({ chatId, senderId, text, createdAt });

  return {
    id: messageRef.id,
    chatId,
    senderId,
    text,
    createdAt: createdAt.toDate().toISOString(),
  };
}

export async function getMessages(
  chatId: string,
  limit: number,
  userId?: string,
) {
  if (userId) {
    await getChatForUser(chatId, userId);
  } else {
    await getChat(chatId);
  }

  const snapshot = await messagesCollection(chatId)
    .orderBy("createdAt", "desc")
    .orderBy(FieldPath.documentId(), "desc")
    .limit(limit)
    .get();

  return snapshot.docs.reverse().map((document) => {
    const data = document.data();
    const createdAt = data.createdAt as Timestamp;
    return {
      id: document.id,
      chatId: data.chatId as string,
      senderId: data.senderId as string,
      text: data.text as string,
      createdAt: createdAt.toDate().toISOString(),
      edited: data.edited === true,
      deleted: data.deleted === true,
    };
  });
}

export async function markMessageRead(
  chatId: string,
  messageId: string,
  userId: string,
) {
  await getChatForUser(chatId, userId);

  const messageRef = messagesCollection(chatId).doc(messageId);
  const message = await messageRef.get();
  if (!message.exists) {
    throw new HttpError(404, "Message not found");
  }

  await messageRef
    .collection("readReceipts")
    .doc(userId)
    .set({ userId, readAt: Timestamp.now() });

  return { chatId, messageId, userId, read: true };
}

export async function updateLastSeen(
  chatId: string,
  userId: string,
  messageId: string,
) {
  await getChatForUser(chatId, userId);

  const messageRef = messagesCollection(chatId).doc(messageId);
  const message = await messageRef.get();
  if (!message.exists) {
    throw new HttpError(404, "Message not found");
  }

  const lastSeenRef = firestore
    .collection("chats")
    .doc(chatId)
    .collection("lastSeen")
    .doc(userId);

  await lastSeenRef.set({
    userId,
    messageId,
    messageCreatedAt: message.get("createdAt"),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { chatId, userId, messageId };
}

export async function editMessage(
  chatId: string,
  messageId: string,
  userId: string,
  text: string,
) {
  await getChatForUser(chatId, userId);
  const messageRef = messagesCollection(chatId).doc(messageId);

  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(messageRef);
    if (!snapshot.exists) {
      throw new HttpError(404, "Message not found");
    }

    const data = snapshot.data();
    if (!data || data.senderId !== userId) {
      throw new HttpError(403, "Only the message sender can edit this message");
    }
    if (data.deleted === true) {
      throw new HttpError(409, "Deleted messages cannot be edited");
    }

    const editedAt = Timestamp.now();
    transaction.update(messageRef, {
      text,
      edited: true,
      editedAt,
      updatedAt: editedAt,
    });

    return {
      id: messageId,
      chatId,
      senderId: userId,
      text,
      edited: true,
      editedAt: editedAt.toDate().toISOString(),
    };
  });
}

export async function deleteMessage(
  chatId: string,
  messageId: string,
  userId: string,
) {
  await getChatForUser(chatId, userId);
  const messageRef = messagesCollection(chatId).doc(messageId);

  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(messageRef);
    if (!snapshot.exists) {
      throw new HttpError(404, "Message not found");
    }

    const data = snapshot.data();
    if (!data || data.senderId !== userId) {
      throw new HttpError(403, "Only the message sender can delete this message");
    }
    if (data.deleted === true) {
      throw new HttpError(409, "Message has already been deleted");
    }

    const deletedAt = Timestamp.now();
    transaction.update(messageRef, {
      text: "",
      deleted: true,
      deletedAt,
      updatedAt: deletedAt,
    });

    return {
      id: messageId,
      chatId,
      senderId: userId,
      deleted: true,
      deletedAt: deletedAt.toDate().toISOString(),
    };
  });
}
