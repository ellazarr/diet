/* הודעות מתוזמנות בצ'אט: נשלחות כשמגיע הזמן (פונקציה מתוזמנת כל דקה, וגם בכל פנייה לצ'אט) */
import {notifyChatMsg} from "./push.mjs";
export async function deliverDue(st,now=Date.now()){
 const sch=(await st.get("chatsched",{type:"json"}))||[];
 const due=sch.filter(x=>x.at<=now).sort((a,b)=>a.at-b.at);if(!due.length)return 0;
 const pub=(await st.get("public",{type:"json"}))||{members:{}};
 const m=(await st.get("chat",{type:"json"}))||[],fresh=[];
 for(const d of due){if(m.some(x=>x.id===d.id))continue;
  const o=d.q?m.find(x=>x.id===d.q&&!x.del):null;
  const msg={id:d.id,by:d.by,ts:Math.max(now,m.length?m[m.length-1].ts+1:0),text:d.text,sched:true};
  if(o)msg.q={id:o.id,by:o.by,text:(o.text||"").slice(0,120),f:o.f?o.f.name:undefined};
  m.push(msg);fresh.push(msg)}
 await st.setJSON("chat",m.slice(-300));
 await st.setJSON("chatsched",sch.filter(x=>x.at>now));
 for(const msg of fresh)await notifyChatMsg(st,pub,msg);
 return fresh.length}
