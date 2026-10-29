export const fields = ['name','contact','location','crime','date','amount','transaction','suspect','platform','narrative'];
export const requiredFields=['name','contact','location','crime','date','narrative'];
export const crimeTypes=['UPI / online fraud','Phishing','Sextortion','Social media hacking','Identity theft','Ransomware','Cyberbullying','Fake job / investment scam','Other'];
export function missingFields(data){return requiredFields.filter(key=>!String(data[key]||'').trim());}
export function validateAnswer(key,value){
 if(!value.trim())return 'Please enter an answer, or use Skip if this question is optional.';
 if(value.length>5000)return 'Please keep this answer under 5,000 characters.';
 if(key==='contact'&&!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)||/^\+?[\d\s()-]{7,18}$/.test(value)))return 'Enter a valid phone number or email address.';
 if(key==='amount'&&(!Number.isFinite(Number(value))||Number(value)<0))return 'Enter an amount of zero or more, using numbers only.';
 if(key==='date'&&(!Number.isFinite(Date.parse(value))||Date.parse(value)>Date.now()))return 'Choose a date and time that is not in the future.';
 return '';
}
export function formatComplaint(data,evidence=[]){
 const v=key=>String(data[key]||'Not provided');
 return `To: The Officer in Charge / Cyber Crime Cell\nSubject: Complaint regarding ${v('crime')}\n\nI, ${v('name')}, residing in ${v('location')}, wish to report the following incident.\n\nContact: ${v('contact')}\nIncident date and time (as entered, local time): ${v('date')}\nPlatform: ${v('platform')}\nAmount reported lost (INR): ${v('amount')}\nTransaction reference(s): ${v('transaction')}\nSuspect identifiers (unverified): ${v('suspect')}\n\nMy account, preserved in my original words:\n${v('narrative')}\n\nEvidence listed:\n${evidence.length?evidence.map((e,i)=>`${i+1}. ${e.name}`).join('\n'):'No evidence listed.'}\n\nI request that this complaint be examined and appropriate action be taken. The information above reflects my account and is subject to verification.\n\nName: ${v('name')}\nSignature: __________________\nDate: __________________\n\nPrepared with the Village of Justice. This is a preparation draft, not an FIR or proof of submission.`;
}
export function makeComplaint(data,language,evidence,consent){return {schemaVersion:'1.0',language,officialLanguage:'en',consent,details:data,originalNarrative:data.narrative||'',evidence:evidence.map(({name,size,type,url})=>({name,size,type,...(url?{url}:{})})),status:'draft',preparedAt:new Date().toISOString()};}
export async function encryptDraft(data,password){
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt']);
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(data)));
 return JSON.stringify({version:1,salt:Array.from(salt),iv:Array.from(iv),data:Array.from(new Uint8Array(encrypted))});
}
export async function decryptDraft(text,password){
 const raw=JSON.parse(text);
 if(raw.version!==1||!Array.isArray(raw.salt)||!Array.isArray(raw.iv)||!Array.isArray(raw.data)||raw.data.length>2000000)throw Error('Invalid backup');
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:new Uint8Array(raw.salt),iterations:250000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
 const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(raw.iv)},key,new Uint8Array(raw.data));
 const result=JSON.parse(new TextDecoder().decode(plaintext));
 if(result.schemaVersion!=='1.0'||typeof result.details!=='object'||!result.details)throw Error('Invalid complaint');
 for(const [k,v] of Object.entries(result.details))if(!fields.includes(k)||typeof v!=='string'||v.length>5000)throw Error('Invalid details');
 return result;
}
