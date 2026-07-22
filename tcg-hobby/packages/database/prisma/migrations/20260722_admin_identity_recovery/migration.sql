CREATE TYPE "UserSecurityTokenType" AS ENUM ('PASSWORD_RESET');
CREATE TABLE "UserSecurityToken" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" "UserSecurityTokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSecurityToken_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AdminRoleChange" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "previousRole" "UserRole" NOT NULL,
    "newRole" "UserRole" NOT NULL, "changedByUserId" TEXT, "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminRoleChange_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserSecurityToken_tokenHash_key" ON "UserSecurityToken"("tokenHash");
CREATE INDEX "UserSecurityToken_userId_type_createdAt_idx" ON "UserSecurityToken"("userId", "type", "createdAt");
CREATE INDEX "UserSecurityToken_expiresAt_usedAt_idx" ON "UserSecurityToken"("expiresAt", "usedAt");
CREATE INDEX "AdminRoleChange_userId_createdAt_idx" ON "AdminRoleChange"("userId", "createdAt");
CREATE INDEX "AdminRoleChange_changedByUserId_createdAt_idx" ON "AdminRoleChange"("changedByUserId", "createdAt");
ALTER TABLE "UserSecurityToken" ADD CONSTRAINT "UserSecurityToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminRoleChange" ADD CONSTRAINT "AdminRoleChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminRoleChange" ADD CONSTRAINT "AdminRoleChange_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE OR REPLACE FUNCTION protect_last_admin_user() RETURNS TRIGGER AS $$
BEGIN
  IF OLD."role" = 'ADMIN' AND (TG_OP = 'DELETE' OR NEW."role" <> 'ADMIN') THEN
    IF (SELECT COUNT(*) FROM "User" WHERE "role" = 'ADMIN') <= 1 THEN
      RAISE EXCEPTION 'The last ADMIN user cannot be demoted or deleted.';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "User_protect_last_admin_update" BEFORE UPDATE OF "role" ON "User" FOR EACH ROW EXECUTE FUNCTION protect_last_admin_user();
CREATE TRIGGER "User_protect_last_admin_delete" BEFORE DELETE ON "User" FOR EACH ROW EXECUTE FUNCTION protect_last_admin_user();
