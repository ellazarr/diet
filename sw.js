/* Service worker: מקבל התראות Push גם כשהאתר סגור */
self.addEventListener("install",e=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("push",e=>{
  let d={};try{d=e.data?e.data.json():{}}catch(_){}
  e.waitUntil(self.registration.showNotification(d.title||"תחרות הדיאטה",{
    body:d.body||"",icon:"/icon-192.png",badge:"/icon-192.png",tag:d.tag||"chat",renotify:true,
    lang:"he",dir:"rtl",data:{url:d.url||"/"}}));
});
self.addEventListener("notificationclick",e=>{
  e.notification.close();const url=(e.notification.data&&e.notification.data.url)||"/";
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{
    for(const c of cs){if("focus" in c){if(c.navigate)try{c.navigate(url)}catch(_){}return c.focus()}}
    return self.clients.openWindow(url)}));
});
