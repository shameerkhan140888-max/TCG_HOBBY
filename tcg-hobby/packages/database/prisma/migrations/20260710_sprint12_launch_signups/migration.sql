CREATE TABLE "LaunchSignup" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'storefront',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaunchSignup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LaunchSignup_email_key" ON "LaunchSignup"("email");
CREATE INDEX "LaunchSignup_createdAt_idx" ON "LaunchSignup"("createdAt");
CREATE INDEX "LaunchSignup_source_createdAt_idx" ON "LaunchSignup"("source", "createdAt");
