import {db} from './db.mjs';
const email=process.argv[2];
if(!email)throw Error('Usage: node server/admin.mjs registered-admin-email');
const result=db.prepare("UPDATE users SET role='admin' WHERE email=?").run(email.toLowerCase().trim());
if(!result.changes)throw Error('Register this account locally first.');
console.log('Administrator role assigned. Sign out and sign in again.');
