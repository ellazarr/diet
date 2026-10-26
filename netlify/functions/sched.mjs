import {getStore} from "@netlify/blobs";
import {deliverDue} from "../../lib/sched.mjs";
export default async()=>{await deliverDue(getStore({name:"diet",consistency:"strong"}))};
export const config={schedule:"*/5 * * * *"};
