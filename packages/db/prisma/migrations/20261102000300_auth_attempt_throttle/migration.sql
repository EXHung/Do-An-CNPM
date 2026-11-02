-- Persist sign-in rate limits. Keys are SHA-256 hashes, never raw IP or email.
CREATE TABLE "AuthAttempt" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowEndsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthAttempt_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "AuthAttempt_windowEndsAt_idx" ON "AuthAttempt"("windowEndsAt");

ALTER TABLE "AuthAttempt" ENABLE ROW LEVEL SECURITY;
