import { promoteExistingUser } from '@tcg-hobby/database';
function value(name: string): string | null { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] ?? null : null; }
const email = value('--email'); const roleValue = (value('--role') ?? 'ADMIN').toUpperCase(); const actorEmail = value('--actor-email');
if (!email) throw new Error('Usage: npm run admin:promote -- --email user@example.com [--role ADMIN|STAFF] [--actor-email admin@example.com]');
if (roleValue !== 'ADMIN' && roleValue !== 'STAFF') throw new Error('--role must be ADMIN or STAFF.');
const result = await promoteExistingUser({ email, role: roleValue, actorEmail, source: 'CLI_ADMIN_PROMOTE' });
console.log(result.changed ? `Role updated: ${result.email} is now ${result.role}.` : `No change: ${result.email} is already ${result.role}.`);
