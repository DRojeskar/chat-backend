-- Add group metadata while preserving existing 1:1 chat rows.
ALTER TABLE "Chat"
ADD COLUMN "isGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "name" TEXT,
ALTER COLUMN "userAId" DROP NOT NULL,
ALTER COLUMN "userBId" DROP NOT NULL;

CREATE INDEX "Chat_isGroup_idx" ON "Chat" ("isGroup");

CREATE TYPE "ChatMemberRole" AS ENUM ('ADMIN', 'MEMBER');

CREATE TABLE "ChatMember" (
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMember_pkey" PRIMARY KEY ("chatId", "userId")
);

CREATE INDEX "ChatMember_userId_idx" ON "ChatMember" ("userId");

ALTER TABLE "ChatMember"
ADD CONSTRAINT "ChatMember_chatId_fkey"
FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatMember"
ADD CONSTRAINT "ChatMember_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill all existing direct-chat participants.
INSERT INTO "ChatMember" ("chatId", "userId", "role")
SELECT "id", "userAId", 'ADMIN'::"ChatMemberRole" FROM "Chat"
UNION ALL
SELECT "id", "userBId", 'MEMBER'::"ChatMemberRole" FROM "Chat";
