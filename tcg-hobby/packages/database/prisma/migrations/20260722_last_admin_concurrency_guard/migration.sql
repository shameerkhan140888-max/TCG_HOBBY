CREATE OR REPLACE FUNCTION protect_last_admin_user() RETURNS TRIGGER AS $$
BEGIN
  IF OLD."role" = 'ADMIN' AND (TG_OP = 'DELETE' OR NEW."role" <> 'ADMIN') THEN
    PERFORM pg_advisory_xact_lock(hashtext('tcg_hobby_last_admin'));
    IF (SELECT COUNT(*) FROM "User" WHERE "role" = 'ADMIN') <= 1 THEN
      RAISE EXCEPTION 'The last ADMIN user cannot be demoted or deleted.';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;
