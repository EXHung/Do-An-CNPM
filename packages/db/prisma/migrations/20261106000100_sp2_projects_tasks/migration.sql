-- SP2: project ownership, editing metadata and task assignment.
ALTER TABLE "Project" ADD COLUMN "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN "ownerId" TEXT,
ADD COLUMN "taskCounter" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Project" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "Task" ADD COLUMN "assigneeId" TEXT;

CREATE INDEX "Task_workspaceId_assigneeId_idx" ON "Task"("workspaceId", "assigneeId");

ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
