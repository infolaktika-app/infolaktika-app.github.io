// Creates (or resets) the INFOLAKTIKA administrator account.
// Credentials come from environment variables — they are never shipped to the browser.
//
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   ADMIN_USERNAME=admin ADMIN_PASSWORD='a-strong-password' \
//   node scripts/create-admin.mjs
//
// Optional: ADMIN_FIRST_NAME, ADMIN_LAST_NAME, VITE_LOGIN_EMAIL_DOMAIN.
// The values may also be placed in a local .env file (not committed).
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const username = (process.env.ADMIN_USERNAME || '').toLowerCase().trim();
const password = process.env.ADMIN_PASSWORD || '';
const domain = process.env.VITE_LOGIN_EMAIL_DOMAIN || 'infolaktika.app';

if (!url || !key || !username || !password) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_USERNAME or ADMIN_PASSWORD.');
  process.exit(1);
}
if (!/^[a-z0-9_.]{3,24}$/.test(username)) {
  console.error('ADMIN_USERNAME must be 3–24 characters: a–z, 0–9, "_" or ".".');
  process.exit(1);
}
if (password.length < 8) {
  console.error('ADMIN_PASSWORD must be at least 8 characters.');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const email = `${username}@${domain}`;

const { data: list, error: listErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (listErr) throw listErr;
let user = list.users.find((u) => u.email === email);

if (user) {
  const { error } = await sb.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (error) throw error;
  console.log(`Updated password for existing admin "${username}".`);
} else {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username,
      first_name: process.env.ADMIN_FIRST_NAME || 'Әкімші',
      last_name: process.env.ADMIN_LAST_NAME || '',
    },
  });
  if (error) throw error;
  user = data.user;
  console.log(`Created admin user "${username}".`);
}

const { error: roleErr } = await sb.from('profiles').update({ role: 'admin' }).eq('id', user.id);
if (roleErr) throw roleErr;
console.log('Role set to admin. Sign in at /admin/login');
