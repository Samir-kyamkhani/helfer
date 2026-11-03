-- CreateTable
CREATE TABLE "AgentChatHistory" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentChatHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentChatHistory_workspace_id_key" ON "AgentChatHistory"("workspace_id");

-- AddForeignKey
ALTER TABLE "AgentChatHistory" ADD CONSTRAINT "AgentChatHistory_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
