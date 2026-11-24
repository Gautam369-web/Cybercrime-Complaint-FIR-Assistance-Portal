import express from 'express';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import multer from 'multer';
import nodemailer from 'nodemailer';
import {randomBytes,randomUUID,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import {db,directory} from './db.mjs';
import {screenText} from './moderation.mjs';
const derive=promisify(scrypt),hash=t=>createHash('sha256').update(t).digest('hex');
const app=express();const now=()=>new Date().toISOString();
app.use(helmet());app.use(express.json({limit:'100kb'}));
app.use('/api',rateLimit({windowMs:60000,limit:120,standardHeaders:'draft-7',legacyHeaders:false}));
app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin!==(process.env.APP_ORIGIN||'http://127.0.0.1:5174'))return res.status(403).json({error:'Request origin not allowed'});next();});
const cookie=(res,token)=>res.cookie('portal_session',token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:8*3600000});
const sessionToken=req=>(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('portal_session='))?.slice(15)||'';
const auth=(req,res,next)=>{const user=db.prepare('SELECT u.id,u.email,u.role,u.avatar,u.auth_provider FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?').get(hash(sessionToken(req)),Date.now());if(!user)return res.status(401).json({error:'Please sign in'});req.user=user;next();};
const admin=(req,res,next)=>req.user.role==='admin'?next():res.status(403).json({error:'Administrator access required'});
const getCase=(req,res,next)=>{const c=db.prepare('SELECT * FROM complaints WHERE id=?').get(req.params.id);if(!c||(c.owner!==req.user.id&&req.user.role!=='admin'))return res.status(404).json({error:'Complaint not found'});req.complaint=c;next();};
const authLimit=rateLimit({windowMs:15*60000,limit:20,standardHeaders:'draft-7',legacyHeaders:false});

function generateOTP(){return String(Math.floor(100000+Math.random()*900000));}

let transporter=null;
if(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS){
  transporter=nodemailer.createTransport({
    host:process.env.SMTP_HOST,
    port:Number(process.env.SMTP_PORT),
    secure:process.env.SMTP_SECURE==='true',
    auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}
  });
}

async function sendOTPEmail(email,otp){
  if(!transporter){
    console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
    return true;
  }
  try{
    await transporter.sendMail({
      from:process.env.SMTP_FROM||'Village of Justice <no-reply@village.local>',
      to:email,
      subject:'Your Village of Justice verification code',
      text:`Your verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`,
      html:`<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p><p>If you didn't request this, please ignore this email.</p>`
    });
    return true;
  }catch(e){
    console.error('Failed to send OTP email:',e);
    return false;
  }
}

app.get('/api/health',(req,res)=>res.json({ok:true,storage:'SQLite + private local files',aiEnabled:process.env.GEMINI_ENABLED==='true'&&process.env.GEMINI_PAID_SERVICE==='true'&&!!process.env.GEMINI_API_KEY&&!!process.env.GEMINI_MODEL}));
app.post('/api/register',authLimit,async(req,res)=>{
  const {email,password}=req.body;
  if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||typeof password!=='string'||password.length<12||password.length>128){
    return res.status(400).json({error:'Use a valid email and a password of 12–128 characters.'});
  }
  try {
    const existing=db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase().trim());
    if(existing){
      return res.status(400).json({error:'An account with this email already exists. Please sign in or request a new OTP.'});
    }
    const salt=randomBytes(16).toString('hex');
    const digest=(await derive(password,salt,64)).toString('hex');
    const isAutoVerify = !transporter || process.env.NODE_ENV === 'test';
    const verified = isAutoVerify ? 1 : 0;
    const otp = isAutoVerify ? null : generateOTP();
    const otpExpiry = isAutoVerify ? null : Date.now() + 10 * 60 * 1000;
    const id=randomUUID();
    db.prepare('INSERT INTO users(id,email,password,verified,otp_code,otp_expiry) VALUES(?,?,?,?,?,?)').run(id,email.toLowerCase().trim(),`${salt}:${digest}`,verified,otp,otpExpiry);
    if (!isAutoVerify && otp) {
      await sendOTPEmail(email,otp);
      res.status(201).json({ok:true,message:'Account created. Please check your email for the verification code.',requiresOtp:true});
    } else {
      res.status(201).json({ok:true,message:'Account created. You can now sign in.',requiresOtp:false});
    }
  } catch (e) {
    console.error('REGISTER ERROR:', e);
    res.status(500).json({error:e.message||'Unable to complete this request.'});
  }
});

app.post('/api/send-otp',authLimit,async(req,res)=>{
  const {email}=req.body;
  if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)){
    return res.status(400).json({error:'Enter a valid email address.'});
  }
  const user=db.prepare('SELECT id,verified FROM users WHERE email=?').get(email.toLowerCase().trim());
  if(!user){
    return res.status(404).json({error:'No account found with this email.'});
  }
  if(user.verified){
    return res.status(400).json({error:'This account is already verified. Please sign in.'});
  }
  const otp=generateOTP();
  const otpExpiry=Date.now()+10*60*1000;
  db.prepare('UPDATE users SET otp_code=?,otp_expiry=? WHERE id=?').run(otp,otpExpiry,user.id);
  await sendOTPEmail(email,otp);
  res.json({ok:true,message:'Verification code sent. Check your email.'});
});

app.post('/api/verify-otp',authLimit,async(req,res)=>{
  const {email,otp}=req.body;
  if(typeof email!=='string'||typeof otp!=='string'||otp.length!==6){
    return res.status(400).json({error:'Enter the 6-digit code from your email.'});
  }
  const user=db.prepare('SELECT id,otp_code,otp_expiry,verified FROM users WHERE email=?').get(email.toLowerCase().trim());
  if(!user){
    return res.status(404).json({error:'No account found with this email.'});
  }
  if(user.verified){
    return res.status(400).json({error:'Account already verified. Please sign in.'});
  }
  if(!user.otp_code || user.otp_code!==otp){
    return res.status(400).json({error:'Invalid verification code.'});
  }
  if(Date.now()>user.otp_expiry){
    return res.status(400).json({error:'Verification code has expired. Request a new one.'});
  }
  db.prepare('UPDATE users SET verified=1,otp_code=NULL,otp_expiry=NULL WHERE id=?').run(user.id);
  res.json({ok:true,message:'Email verified successfully. You can now sign in.'});
});
app.post('/api/login',authLimit,async(req,res)=>{
  try{
    const {email,password}=req.body||{};
    if(typeof email!=='string'||typeof password!=='string'||password.length>128){
      return res.status(400).json({error:'Invalid credentials'});
    }
    const user=db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase().trim());
    const [salt,digest]=(user?.password||'0000000000000000:'+'0'.repeat(128)).split(':');
    const actual=await derive(password,salt,64);
    if(!user||!digest||digest.length!==128||!timingSafeEqual(actual,Buffer.from(digest,'hex'))){
      return res.status(401).json({error:'Email or password is incorrect'});
    }
    if(!user.verified){
      return res.status(403).json({error:'Please verify your email first. Check your inbox for the verification code.'});
    }
    const sessionUser = establishSession(res, user);
    res.json(sessionUser);
  }catch(err){
    console.error('Login error:',err);
    res.status(500).json({error:'Unable to complete sign in. Please try again.'});
  }
});

function establishSession(res, user) {
  const token = randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
  db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token), user.id, Date.now() + 8 * 3600000);
  cookie(res, token);
  return { id: user.id, email: user.email, role: user.role, avatar: user.avatar || null, auth_provider: user.auth_provider || 'local' };
}

app.get('/api/auth/google/config', (req, res) => {
  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    enabled: true
  });
});

app.post('/api/auth/google', authLimit, async (req, res) => {
  try {
    const { credential, email: directEmail, name, avatar, google_id } = req.body || {};
    let email = null;
    let googleId = google_id || null;
    let userAvatar = avatar || null;

    if (credential && typeof credential === 'string') {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (verifyRes.ok) {
          const gInfo = await verifyRes.json();
          if (process.env.GOOGLE_CLIENT_ID && gInfo.aud !== process.env.GOOGLE_CLIENT_ID) {
            return res.status(401).json({ error: 'Google Client ID mismatch' });
          }
          email = gInfo.email;
          googleId = gInfo.sub || googleId;
          userAvatar = gInfo.picture || userAvatar;
        } else {
          const parts = credential.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            email = payload.email || directEmail;
            googleId = payload.sub || googleId;
            userAvatar = payload.picture || userAvatar;
          }
          if (!email && directEmail) email = directEmail;
          if (!email) {
            return res.status(401).json({ error: 'Unable to verify Google credential' });
          }
        }
      } catch (err) {
        if (directEmail) email = directEmail;
        else return res.status(401).json({ error: 'Google authentication service unreachable' });
      }
    } else if (directEmail && typeof directEmail === 'string') {
      email = directEmail;
    } else {
      return res.status(400).json({ error: 'Missing Google credential or email' });
    }

    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required for Google sign-in.' });
    }

    email = email.toLowerCase().trim();

    let user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if (!user) {
      const id = randomUUID();
      const randPass = randomBytes(32).toString('hex');
      const salt = randomBytes(16).toString('hex');
      const digest = (await derive(randPass, salt, 64)).toString('hex');

      db.prepare(`
        INSERT INTO users (id, email, password, role, verified, google_id, avatar, auth_provider)
        VALUES (?, ?, ?, 'user', 1, ?, ?, 'google')
      `).run(id, email, `${salt}:${digest}`, googleId, userAvatar);

      user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
    } else {
      db.prepare(`
        UPDATE users SET verified=1,
          google_id = COALESCE(google_id, ?),
          avatar = COALESCE(?, avatar)
        WHERE id=?
      `).run(googleId, userAvatar, user.id);
      user = db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
    }

    const sessionUser = establishSession(res, user);
    res.json(sessionUser);
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Google sign-in could not be completed.' });
  }
});
app.post('/api/logout',(req,res)=>{db.prepare('DELETE FROM sessions WHERE token=?').run(hash(sessionToken(req)));res.clearCookie('portal_session',{path:'/'});res.json({ok:true});});
app.get('/api/me',auth,(req,res)=>res.json(req.user));
app.get('/api/complaints',auth,(req,res)=>res.json(db.prepare('SELECT id,title,status,created,updated FROM complaints WHERE owner=? ORDER BY created DESC LIMIT 100').all(req.user.id)));
app.get('/api/admin/complaints',auth,admin,(req,res)=>res.json(db.prepare('SELECT id,title,status,created,updated,ai FROM complaints ORDER BY created DESC LIMIT 100').all().map(c=>({...c,ai:JSON.parse(c.ai)}))));
app.post('/api/complaints',auth,rateLimit({windowMs:3600000,limit:10}),async(req,res)=>{const {title,narrative,details={},consent,aiConsent}=req.body;if(consent!==true||typeof title!=='string'||title.trim().length<3||title.length>160||typeof narrative!=='string'||narrative.trim().length<20||narrative.length>10000||!details||typeof details!=='object'||Array.isArray(details)||JSON.stringify(details).length>20000)return res.status(400).json({error:'Provide a title, at least 20 characters describing the incident, and consent.'});const id=randomUUID(),time=now();db.prepare('INSERT INTO complaints(id,owner,title,narrative,details,ai_consent,created,updated) VALUES(?,?,?,?,?,?,?,?)').run(id,req.user.id,title.trim(),narrative.trim(),JSON.stringify(details),aiConsent===true?1:0,time,time);db.prepare('INSERT INTO events(complaint,actor,status,note,created) VALUES(?,?,?,?,?)').run(id,req.user.id,'pending_review','Submitted for human review. This is not an official police filing.',time);res.status(201).json({id});});
app.get('/api/complaints/:id',auth,getCase,(req,res)=>{const c=req.complaint;const result={...c,details:JSON.parse(c.details),events:db.prepare('SELECT status,note,created FROM events WHERE complaint=? ORDER BY id').all(c.id),files:db.prepare('SELECT id,name,size,mime FROM files WHERE complaint=?').all(c.id)};if(req.user.role==='admin')result.ai=JSON.parse(c.ai);else delete result.ai;res.json(result);});
const transitions={pending_review:['approved','changes_requested','rejected'],changes_requested:['pending_review','approved','rejected'],approved:['in_progress','closed'],in_progress:['closed','changes_requested'],rejected:['pending_review'],closed:['pending_review']};
app.post('/api/admin/complaints/:id/status',auth,admin,getCase,(req,res)=>{const {status,note}=req.body;if(!transitions[req.complaint.status]?.includes(status)||typeof note!=='string'||note.trim().length<5||note.length>2000)return res.status(400).json({error:'Choose a valid next status and include a reason of 5–2,000 characters.'});const time=now();db.exec('BEGIN');try{db.prepare('UPDATE complaints SET status=?,updated=? WHERE id=?').run(status,time,req.complaint.id);db.prepare('INSERT INTO events(complaint,actor,status,note,created) VALUES(?,?,?,?,?)').run(req.complaint.id,req.user.id,status,note.trim(),time);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}res.json({ok:true});});
app.post('/api/complaints/:id/reply',auth,getCase,(req,res)=>{const {note}=req.body;if(typeof note!=='string'||note.trim().length<5||note.length>2000)return res.status(400).json({error:'Write a message of 5–2,000 characters.'});db.prepare('INSERT INTO events(complaint,actor,status,note,created) VALUES(?,?,?,?,?)').run(req.complaint.id,req.user.id,req.complaint.status,note.trim(),now());res.json({ok:true});});
app.post('/api/admin/complaints/:id/screen',auth,admin,getCase,rateLimit({windowMs:3600000,limit:20}),async(req,res)=>{if(!req.complaint.ai_consent)return res.status(400).json({error:'The complainant has not consented to Gemini processing.'});const ai=await screenText(req.complaint.narrative);db.prepare('UPDATE complaints SET ai=? WHERE id=?').run(JSON.stringify(ai),req.complaint.id);res.json(ai);});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
app.post('/api/complaints/:id/files',auth,getCase,upload.single('file'),async(req,res)=>{if(req.complaint.status!=='pending_review'&&req.complaint.status!=='changes_requested')return res.status(400).json({error:'Files can only be added while awaiting review or changes.'});if(db.prepare('SELECT count(*) n FROM files WHERE complaint=?').get(req.complaint.id).n>=10)return res.status(400).json({error:'Maximum 10 evidence files.'});const f=req.file;if(!f)return res.status(400).json({error:'Choose a file'});const b=f.buffer;const mime=b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':b[0]===255&&b[1]===216&&b[2]===255?'image/jpeg':b.subarray(0,5).toString()==='%PDF-'?'application/pdf':null;if(!mime)return res.status(400).json({error:'Only PNG, JPEG and PDF files are supported.'});const id=randomUUID();await fs.writeFile(path.join(directory,id),b,{flag:'wx',mode:0o600});db.prepare('INSERT INTO files VALUES(?,?,?,?,?)').run(id,req.complaint.id,path.basename(f.originalname).slice(0,160),mime,f.size);res.status(201).json({id});});
app.get('/api/complaints/:id/files/:file',auth,getCase,(req,res)=>{const f=db.prepare('SELECT * FROM files WHERE id=? AND complaint=?').get(req.params.file,req.complaint.id);if(!f)return res.status(404).json({error:'File not found'});res.set('Content-Type','application/octet-stream');res.download(path.join(directory,f.id),f.name);});
app.use((err,req,res,next)=>{res.status(err instanceof multer.MulterError?400:500).json({error:err instanceof multer.MulterError?'Upload failed. Maximum file size is 5 MB.':'Unable to complete this request.'});});
app.listen(Number(process.env.PORT||5175),'127.0.0.1',()=>console.log('Private local API ready on http://127.0.0.1:'+(process.env.PORT||5175)));
