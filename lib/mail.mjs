export async function sendMail(to,subject,html){
 const u=process.env.GMAIL_USER,p=process.env.GMAIL_APP_PASSWORD;
 if(!u||!p)throw new Error("mail not configured");
 const {default:nm}=await import("nodemailer");
 await nm.createTransport({service:"gmail",auth:{user:u,pass:p}}).sendMail({from:`"תחרות הדיאטה" <${u}>`,to,subject,html})}
export const reminderHtml=(label,url)=>`<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6"><h2>⚖️ יום שישי, ${label}</h2><p>זה הזמן לשקול ולעדכן את התוצאה של השבוע בתחרות הדיאטה המשפחתית.</p><p><a href="${url}" style="background:#2f9e6e;color:#fff;padding:10px 20px;border-radius:99px;text-decoration:none">לעדכון באתר</a></p><p style="color:#888;font-size:13px">להפסקת התזכורות: האזור האישי ואז הגדרות.</p></div>`;
