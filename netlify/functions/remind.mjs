import {getStore} from "@netlify/blobs";
import {sendMail,reminderHtml} from "../../lib/mail.mjs";
import {hebLabel} from "../../lib/heb.mjs";
import {pushEach} from "../../lib/push.mjs";
export const run=async(st,send,now=new Date())=>{
 const priv=(await st.get("priv",{type:"json"}))||{},pub=(await st.get("public",{type:"json"}))||{entries:{}};
 const fri=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem"}).format(now),label=hebLabel(now,"Asia/Jerusalem");
 const url=process.env.URL||process.env.SITE_URL||"",sent=[];
 for(const [id,p] of Object.entries(priv)){
  if(!p.remind||!p.email||(pub.entries||{})[fri+"__"+id]!==undefined)continue;
  try{await send(p.email,"⚖️ תזכורת: יום שקילה, "+label,reminderHtml(label,url));sent.push(id)}catch(e){console.error("mail failed",id,e.message)}}
 try{await pushEach(st,{kind:"weekly",now,mk:id=>(pub.entries||{})[fri+"__"+id]!==undefined?null:{important:true,payload:{title:"⚖️ יום שקילה, "+label,body:"זה הזמן לשקול ולעדכן את התוצאה של השבוע",tag:"weekly",url:"/"}}})}catch(e){console.error("push failed",e.message)}
 return sent};
export default async()=>{await run(getStore({name:"diet",consistency:"strong"}),sendMail)};
export const config={schedule:"0 5 * * 5"};
