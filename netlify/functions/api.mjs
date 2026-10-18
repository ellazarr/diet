import {getStore} from "@netlify/blobs";
import crypto from "node:crypto";
import {sendMail,reminderHtml} from "../../lib/mail.mjs";
import {hebLabel} from "../../lib/heb.mjs";
export const deps={store:()=>getStore({name:"diet",consistency:"strong"})};
export const config={path:"/api/*"};
const R2=x=>Math.round(x*100)/100,rnd=()=>crypto.randomBytes(5).toString("hex");
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const H=(p,s)=>crypto.scryptSync(p,s,32).toString("hex");
const eq=(a,b)=>a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
const PHOTO=/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]{1,40000}$/,COL=["#e07a5f","#3d85c6","#2f9e6e","#a26bd4","#e0a030","#d6559a","#3aa7b5","#7a8f3a"];
const PEOPLE=[["ima","אמא","#e07a5f",17],["elazar","אלעזר","#3d85c6",26.54],["yosi","יוסי","#2f9e6e",16],["rachel","רחלי","#a26bd4",15.4]];
const HIST=[["2026-08-21","ח׳ אלול",[null,2.94,3.15,null]],["2026-08-28","ט״ו אלול",[1.11,.34,0,null]],["2026-09-04","כ״ב אלול",[.44,1.42,2.92,1.52],2,"החלטה יחידה בשביל לחסוך מלחמה"],["2026-09-11","כ״ט אלול",[2.33,.88,.58,1],0,"גם בשבת להיות עם 'יד על הדופק'..."],["2026-09-18","ז׳ תשרי",[0,.1,.7,0],2,"תשובה ותפילה וצדקה מעבירין את רוע הגזירה!!!"],["2026-09-25","י״ד תשרי",[null,.1,-.35,null],1,"הכנה טובה לפני, כדי לשחרר יותר בחגים"],["2026-10-02","כ״א תשרי",[null,-1.86,null,null]],["2026-10-16","ה׳ חשוון",[-1.33,.44,-1.29,null]]];
const PATCH=[["2026-10-16","ima",-1.33],["2026-10-16","yosi",-1.29]];
const SEED=()=>{const p={members:{},weeks:{},entries:{}};PEOPLE.forEach(([id,name,c,g])=>p.members[id]={name,c,goalPct:g,claimed:false});
 HIST.forEach(([wk,label,v,q,t])=>{p.weeks[wk]={label};if(t)p.weeks[wk].quote={by:PEOPLE[q][0],text:t};v.forEach((x,i)=>{if(x!==null)p.entries[wk+"__"+PEOPLE[i][0]]=x})});return p};
const tot=(pub,id)=>Object.entries(pub.entries).reduce((s,[k,v])=>k.endsWith("__"+id)?s+(v||0):s,0);
const cw=p=>{const k=Object.keys(p.hist).filter(k=>p.hist[k]!==null).sort();return k.length?p.hist[k[k.length-1]]:R2(p.start-p.base)};
const migrate=p=>{if(p.v>=2)return false;let w=R2(p.start-p.base);Object.keys(p.hist).sort().forEach(k=>{if(p.hist[k]!==null){w=R2(w-p.hist[k]);p.hist[k]=w}});p.v=2;return true};
const recompute=(pub,id,p)=>{const aw=p.anchor?p.anchor.wk:"";let prev=p.anchor?p.anchor.w:R2(p.start-p.base);const out={};
 Object.keys(p.hist).sort().forEach(k=>{const w=p.hist[k];
  if(k<=aw){if(k===aw&&w!==null){prev=w;p.anchor.w=w}return}
  if(w===null){pub.entries[k+"__"+id]=null;return}
  pub.entries[k+"__"+id]=R2((prev-w)/prev*100);out[k]={prev,w};prev=w});return out};
const mig3=(pub,id,p)=>{if(p.v>=3)return false;p.v=3;
 const seed=SEED(),ks=Object.keys(seed.entries).filter(k=>k.endsWith("__"+id));
 if(!ks.length||!pub.members[id]||!pub.members[id].claimed)return true;
 const last=ks.map(k=>k.split("__")[0]).sort().pop(),hw=p.hist[last];
 p.anchor={wk:last,w:hw!=null?hw:R2(p.start-p.base)};
 ks.forEach(k=>{const wk=k.split("__")[0];if(wk<=last&&wk in p.hist)pub.entries[k]=seed.entries[k]});
 recompute(pub,id,p);return true};
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem"}).format(new Date());
const closed=wk=>{const t=new Date(wk+"T00:00:00Z");t.setUTCDate(t.getUTCDate()+2);return today()>=t.toISOString().slice(0,10)};
const info=(pub,wk)=>{const cl=Object.keys(pub.members).filter(i=>pub.members[i].claimed),v={};
 Object.keys(pub.entries).forEach(k=>{if(k.startsWith(wk+"__"))v[k.slice(wk.length+2)]=pub.entries[k]});
 const a=Object.entries(v).filter(e=>e[1]!==null);let win=[],low=[];
 if(a.length>=1){const mx=Math.max(...a.map(e=>e[1])),mn=Math.min(...a.map(e=>e[1]));win=a.filter(e=>e[1]===mx).map(e=>e[0]);low=a.length<2||mx===mn?[]:a.filter(e=>e[1]===mn).map(e=>e[0])}
 return{done:closed(wk)||(cl.length>0&&cl.every(i=>i in v)),win,low}};
export default async req=>{
 const st=deps.store(),act=new URL(req.url).pathname.replace(/^\/api\//,"");
 const pub=(await st.get("public",{type:"json"}))||SEED();
 const priv=(await st.get("priv",{type:"json"}))||{};let dirty=false;
 Object.entries(priv).forEach(([id,p])=>{if(migrate(p))dirty=true;if(mig3(pub,id,p))dirty=true});
 PATCH.forEach(([wk,id,v])=>{const k=wk+"__"+id;if(pub.members[id]&&!pub.members[id].claimed&&!(k in pub.entries)){pub.entries[k]=v;dirty=true}});
 const save=()=>Promise.all([st.setJSON("public",pub),st.setJSON("priv",priv)]);
 if(act==="state"){if(dirty)await save();return J(pub)}
 if(req.method!=="POST")return J({err:"bad"},405);
 const b=await req.json().catch(()=>({}));
 let sec=await st.get("secret");if(!sec){sec=rnd()+rnd();await st.set("secret",sec)}
 const sig=s=>crypto.createHmac("sha256",sec).update(s).digest("hex");
 const tok=id=>{const e=Date.now()+30*864e5;return id+"."+e+"."+sig(id+"."+e)};
 const who=t=>{const[i,e,s]=String(t||"").split(".");return s&&+e>Date.now()&&eq(sig(i+"."+e),s)&&priv[i]?i:null};
 const bad=(m,s=400)=>J({err:m},s),pw=String(b.password||"");
 if(act==="register"){
  const{claim,start,goal}=b;let name=String(b.name||"").trim().slice(0,20);
  if(!name||!(start>0)||!(goal>0)||goal>=start||pw.length<4)return bad("נתונים לא תקינים");
  if(claim&&(!pub.members[claim]||pub.members[claim].claimed))return bad("המשתמש כבר נתפס");
  const id=claim||"m"+rnd(),old=pub.members[id],salt=rnd();
  let base=claim?R2(start*tot(pub,id)/100):0;
  if(claim&&Number(b.current)>20&&Number(b.current)<400)base=R2(start-Number(b.current));
  priv[id]={salt,hash:H(pw,salt),start,goal,base,hist:{},v:3};
  const lw=claim?Object.keys(pub.entries).filter(k=>k.endsWith("__"+id)&&pub.entries[k]!==null).map(k=>k.split("__")[0]).sort().pop():null;
  if(lw)priv[id].anchor={wk:lw,w:R2(start-base)};
  pub.members[id]={c:old?old.c:COL[Object.keys(pub.members).length%COL.length],name:old?old.name:name,av:String(b.av||"").slice(0,4),photo:PHOTO.test(b.photo||"")?b.photo:null,goalPct:R2((start-goal)/start*100),claimed:true};
  await save();return J({id,token:tok(id)})}
 if(act==="login"||act==="reset"){
  const p=priv[b.id];if(!p)return bad("לא נמצא",404);
  if((p.lock||0)>Date.now())return bad("יותר מדי נסיונות, נסו בעוד כמה דקות",429);
  const ok=act==="login"?eq(H(pw,p.salt),p.hash):+b.start===p.start&&String(b.newPassword||"").length>=4;
  if(!ok){p.f=(p.f||0)+1;if(p.f>=6){p.lock=Date.now()+3e5;p.f=0}await save();return bad(act==="login"?"סיסמה שגויה":"הפרטים לא תואמים",401)}
  if(act==="reset"){p.salt=rnd();p.hash=H(String(b.newPassword),p.salt)}
  p.f=0;await save();return J({token:tok(b.id)})}
 const id=who(b.token);if(!id)return bad("יש להיכנס מחדש",401);const p=priv[id];
 if(act==="me")return J({start:p.start,goal:p.goal,kg:cw(p),hist:p.hist,email:p.email||"",remind:!!p.remind});
 if(act==="week"){
  const wk=String(b.wk);if(!/^\d{4}-\d\d-\d\d$/.test(wk))return bad("תאריך לא תקין");
  if(b.skip)p.hist[wk]=null;
  else{const w=Number(b.weight);if(b.weight===""||b.weight==null||!isFinite(w)||w<20||w>400)return bad("נא להזין משקל תקין");p.hist[wk]=R2(w)}
  pub.weeks[wk]=pub.weeks[wk]||{label:String(b.label||wk).slice(0,20)};
  const x=recompute(pub,id,p)[wk];
  await save();return J({ok:1,lost:x?R2(x.prev-x.w):null,pct:x?pub.entries[wk+"__"+id]:null})}
 if(act==="pct"){
  const wk=String(b.wk),k=wk+"__"+id;
  if(!(k in pub.entries)||wk in p.hist)return bad("אי אפשר לערוך שבוע זה כאן");
  if(b.del)delete pub.entries[k];
  else{const x=Number(b.pct);if(b.pct===""||b.pct==null||!isFinite(x)||Math.abs(x)>30)return bad("אחוז לא תקין");pub.entries[k]=R2(x)}
  await save();return J({ok:1})}
 if(act==="del"){const wk=String(b.wk);delete p.hist[wk];if(!p.anchor||wk>p.anchor.wk)delete pub.entries[wk+"__"+id];recompute(pub,id,p);await save();return J({ok:1})}
 if(act==="settings"){
  const{start,goal}=b,m=pub.members[id],name=String(b.name||"").trim().slice(0,20);
  if(!name||!(start>0)||!(goal>0)||goal>=start)return bad("נתונים לא תקינים");
  if(pw){if(pw.length<4)return bad("הסיסמה קצרה מדי");p.salt=rnd();p.hash=H(pw,p.salt)}
  const em=String(b.email||"").trim().slice(0,100);
  if(em&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))return bad("כתובת מייל לא תקינה");
  p.email=em;p.remind=!!b.remind&&!!em;
  p.start=start;p.goal=goal;recompute(pub,id,p);m.name=name;m.av=String(b.av||m.av||"").slice(0,4);m.goalPct=R2((start-goal)/start*100);
  if(PHOTO.test(b.photo||""))m.photo=b.photo;
  await save();return J({ok:1})}
 if(act==="testmail"){
  if(!p.email)return bad("לא הוגדר מייל");
  try{await sendMail(p.email,"⚖️ מייל לדוגמה מתחרות הדיאטה",reminderHtml(hebLabel(new Date(),"Asia/Jerusalem"),process.env.URL||""))}catch(e){return bad("השליחה נכשלה. בדקו שהוגדרו משתני הסביבה של המייל ב-Netlify",500)}
  return J({ok:1})}
 if(act==="post"){
  const rw=Object.keys(pub.weeks).sort().slice(-2),wk=String(b.wk||rw[rw.length-1]),w=info(pub,wk),kind=b.kind==="joke"?"joke":"quote",text=String(b.text||"").trim().slice(0,140);
  if(!text||!rw.includes(wk)||!w.done||!(kind==="quote"?w.win:w.low).includes(id)||pub.weeks[wk][kind])return bad("אין הרשאה",403);
  pub.weeks[wk][kind]={by:id,text};await save();return J({ok:1})}
 return bad("לא קיים",404)};
