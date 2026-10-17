const U=[..."אבגדהוזחט"],T=[..."יכלמנסעפצ"];
export function gem(n){
 if(n===15)return"ט״ו";if(n===16)return"ט״ז";
 const s=n>=10?T[Math.floor(n/10)-1]+(n%10?U[n%10-1]:""):U[n-1];
 return s.length>1?s.slice(0,-1)+"״"+s.slice(-1):s+"׳"}
export function hebLabel(d,tz="UTC"){
 const p=new Intl.DateTimeFormat("he-u-ca-hebrew",{day:"numeric",month:"long",timeZone:tz}).formatToParts(d);
 return gem(+p.find(x=>x.type==="day").value)+" "+p.find(x=>x.type==="month").value}
