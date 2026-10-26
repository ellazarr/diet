/* התראות Push (Web Push עם מפתחות VAPID שנוצרים ונשמרים אוטומטית) */
export const pushDeps={send:null};
export const DEFAULT_PREFS={mode:"all",quiet:true,weekly:true};
export const cleanPrefs=(p,old)=>{const o={...DEFAULT_PREFS,...(old||{})};
 if(p){if(p.mode==="all"||p.mode==="mentions")o.mode=p.mode;if("quiet" in p)o.quiet=!!p.quiet;if("weekly" in p)o.weekly=!!p.weekly}
 return o};
export const ALLOWED_HOST=/^https:\/\/([a-z0-9-]+\.)*(googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)\//i;
/* שקט בשבת: מיום שישי 14:00 עד מוצאי שבת 20:00 (שעון ישראל) */
export function quietNow(d=new Date()){
 const p=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Jerusalem",weekday:"short",hour:"numeric",hourCycle:"h23"}).formatToParts(d);
 const wd=p.find(x=>x.type==="weekday").value,h=+p.find(x=>x.type==="hour").value;
 return (wd==="Fri"&&h>=14)||(wd==="Sat"&&h<20)}
async function webpush(st){
 const mod=(await import("web-push")).default;
 let k=await st.get("vapid",{type:"json"});
 if(!k){k=mod.generateVAPIDKeys();await st.setJSON("vapid",k)}
 mod.setVapidDetails(process.env.URL||"https://example.com",k.publicKey,k.privateKey);
 return{mod,pub:k.publicKey}}
export async function vapidPublic(st){return(await webpush(st)).pub}
/* שליחה: mk(id) מחזיר {payload,important} או null. kind: chat | weekly | test */
export async function pushEach(st,{kind,except,only,mk,now}){
 const ps=(await st.get("push",{type:"json"}))||{};let changed=false,sent=0;
 const ids=Object.keys(ps).filter(id=>id!==except&&(!only||only.includes(id)));
 if(!ids.length)return 0;
 const send=pushDeps.send||(await webpush(st)).mod.sendNotification;
 await Promise.all(ids.map(async id=>{
  const e=ps[id];if(!e||!e.subs||!e.subs.length)return;
  const pr={...DEFAULT_PREFS,...(e.prefs||{})},r=mk(id);if(!r)return;
  if(kind==="chat"&&pr.mode==="mentions"&&!r.important)return;
  if(kind==="weekly"&&!pr.weekly)return;
  if(kind!=="test"&&pr.quiet&&quietNow(now))return;
  await Promise.all(e.subs.slice().map(async s=>{
   try{await send(s.sub,JSON.stringify(r.payload),{TTL:3600,urgency:"normal"});sent++}
   catch(err){if(err&&(err.statusCode===404||err.statusCode===410)){e.subs=e.subs.filter(x=>x!==s);changed=true}}}))}));
 if(changed)await st.setJSON("push",ps);
 return sent}

export async function notifyChatMsg(st,pub,msg){try{
 const who=(pub.members||{})[msg.by]||{},body=msg.text?msg.text.slice(0,100):msg.f?(msg.f.aud?"🎤 הודעה קולית":msg.f.img?"📷 תמונה":"📎 "+msg.f.name):"";
 await Promise.race([pushEach(st,{kind:"chat",except:msg.by,mk:uid=>{const nm=((pub.members||{})[uid]||{}).name||"",imp=!!(nm&&(msg.text||"").includes("@"+nm))||!!(msg.q&&msg.q.by===uid);
  return{important:imp,payload:{title:(imp?"@ ":"")+(who.name||"צ'אט המשפחה"),body,tag:"chat",url:"/#chat"}}}}),new Promise(r=>setTimeout(r,4000))])}catch(e){}}
