import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
test('private accounts, admin review, evidence and fail-safe AI workflow',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'village-test-'));
 const proc=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PORT:'5199',DATA_DIR:dir,GEMINI_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
 try{
 await Promise.race([once(proc.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('API did not start')),10000))]);
 const request=async(url,body,cookie='',origin='http://127.0.0.1:5174')=>{const r=await fetch('http://127.0.0.1:5199/api'+url,{method:body?'POST':'GET',headers:{origin,cookie,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||''};};
 const password='Synthetic-test-123!';
 for(const email of ['owner@example.com','other@example.com','admin@example.com'])assert.equal((await request('/register',{email,password})).status,201);
 const owner=(await request('/login',{email:'owner@example.com',password})).cookie,other=(await request('/login',{email:'other@example.com',password})).cookie;
 const db=new DatabaseSync(path.join(dir,'portal.sqlite'));db.prepare("UPDATE users SET role='admin' WHERE email=?").run('admin@example.com');db.close();
 const admin=(await request('/login',{email:'admin@example.com',password})).cookie;
 assert.equal((await request('/complaints')).status,401);
 assert.equal((await request('/admin/complaints',undefined,owner)).status,403);
 assert.equal((await request('/complaints',{title:'Invalid',narrative:'Long enough synthetic description',consent:true},owner,'https://evil.example')).status,403);
 const submitted=await request('/complaints',{title:'Synthetic phishing report',narrative:'Someone sent a threatening fraudulent message. This is synthetic evidence.',consent:true,aiConsent:true},owner);assert.equal(submitted.status,201);const id=submitted.data.id;
 assert.equal((await request('/complaints/'+id,undefined,other)).status,404);
 assert.equal((await request(`/admin/complaints/${id}/status`,{status:'approved',note:'Unauthorized change'},owner)).status,403);
 const ai=await request(`/admin/complaints/${id}/screen`,{},admin);assert.equal(ai.data.state,'unavailable');
 assert.equal((await request('/complaints/'+id,undefined,owner)).data.status,'pending_review');
 const upload=new FormData();upload.append('file',new Blob(['not really a PDF'],{type:'application/pdf'}),'fake.pdf');assert.equal((await request(`/complaints/${id}/files`,upload,owner)).status,400);
 const valid=new FormData();valid.append('file',new Blob(['%PDF-1.4\nSynthetic fixture'],{type:'application/pdf'}),'test.pdf');const uploaded=await request(`/complaints/${id}/files`,valid,owner);assert.equal(uploaded.status,201);
 assert.equal((await request(`/complaints/${id}/files/${uploaded.data.id}`,undefined,other)).status,404);
 assert.equal((await request(`/admin/complaints/${id}/status`,{status:'closed',note:'Invalid transition'},admin)).status,400);
 assert.equal((await request(`/admin/complaints/${id}/status`,{status:'approved',note:'Reviewed by a human administrator.'},admin)).status,200);
 const tracked=await request('/complaints/'+id,undefined,owner);assert.equal(tracked.data.status,'approved');assert.equal(tracked.data.events.length,2);assert.equal(tracked.data.files.length,1);assert.equal(tracked.data.ai,undefined);
 await request('/logout',{},owner);assert.equal((await request('/me',undefined,owner)).status,401);
 }finally{proc.kill();await once(proc,'exit');await rm(dir,{recursive:true,force:true});}
});
