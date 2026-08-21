import { createFileRoute,Link } from "@tanstack/react-router";
import {useCallback,useEffect,useState} from "react";
import {supabase} from "@/integrations/supabase/client";
import {useAuth} from "@/lib/auth-context";
import {Button} from "@/components/ui/button";
import {RefreshCcw,History,Sparkles,Clock,Bell,Crown,ShieldCheck,Copy,CheckCircle} from "lucide-react";
import {toast} from "sonner";
import {generateVcf,generateNamedVcf,downloadVcf} from "@/lib/vcf";
import {logAudit} from "@/lib/audit";

export const Route=createFileRoute("/_authenticated/dashboard")({component:Dashboard});

type M="freemium"|"premium";
type S="pending"|"approved"|"rejected"|"suspended";
type Stats={total:number;downloaded:number;newAvailable:number;latestVersion:number;lastDownloadVersion:number;lastDownloadDate:string|null;userCode:string;fullName:string;phone:string;status:S;membership:M;registrationDate:string;first:boolean};
type D={id:string;user_id:string;downloaded_at:string;phone:string;user_code:string;full_name:string};

const PRICE=2000,BANK="Opay",NAME="Noah Precious Isaac",ACCOUNT="9130762056",MIN=5;
const active=(x:any)=>{let t=x.last_login_at||x.registration_date;return t&&new Date(t).getTime()>Date.now()-7*86400000};
const mask=(x:string)=>x.length<=4?"•••"+x:x.slice(0,4)+"••••"+x.slice(-2);

function Dashboard(){
 const {user}=useAuth();
 const [s,setS]=useState<Stats|null>(null),[ds,setDs]=useState<D[]>([]),[saved,setSaved]=useState<Set<string>>(new Set()),[busy,setBusy]=useState(""),[pending,setPending]=useState(false),[copied,setCopied]=useState(false);

 const load=useCallback(async()=>{
  if(!user)return;
  const [{data:p},{data:v},{data:members},{data:pay},{data:old}]=await Promise.all([
   supabase.from("profiles").select("user_code,full_name,phone,last_download_version_number,last_download_date,total_contacts_received,status,membership,registration_date").eq("id",user.id).maybeSingle(),
   supabase.from("contact_versions").select("version_number").order("version_number",{ascending:false}).limit(1).maybeSingle(),
   supabase.from("profiles").select("id,last_login_at,registration_date").eq("status","approved").neq("id",user.id),
   supabase.from("premium_payment_requests").select("status").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle(),
   supabase.from("user_downloaded_contacts").select("contact_id").eq("user_id",user.id)
  ]);
  const ids=new Set((old||[]).map(x=>x.contact_id as string));setSaved(ids);setPending(pay?.status==="pending");
  const fresh=(members||[]).filter(active).filter(x=>!ids.has(x.id));
  setS({total:(members||[]).filter(active).length,downloaded:p?.total_contacts_received||0,newAvailable:fresh.length,latestVersion:v?.version_number||0,lastDownloadVersion:p?.last_download_version_number||0,lastDownloadDate:p?.last_download_date||null,userCode:p?.user_code||"",fullName:p?.full_name||"",phone:p?.phone||"",status:p?.status||"approved",membership:p?.membership||"freemium",registrationDate:p?.registration_date||"",first:ids.size===0});

  const {data:rows}=await supabase.from("user_downloaded_contacts").select("id,downloaded_at,user_id").eq("contact_id",user.id).order("downloaded_at",{ascending:false}).limit(200);
  const uids=[...new Set((rows||[]).map(x=>x.user_id))];
  let mp=new Map<string,any>();
  if(uids.length){
   const {data}=await supabase.from("profiles").select("id,phone,user_code,full_name").in("id",uids);
   mp=new Map((data||[]).map(x=>[x.id,x]));
  }
  setDs((rows||[]).map(x=>{let p=mp.get(x.user_id)||{};return{id:x.id,user_id:x.user_id,downloaded_at:x.downloaded_at,phone:p.phone||"",user_code:p.user_code||"—",full_name:p.full_name||""}}));
 },[user]);

 useEffect(()=>{load()},[load]);

 async function copy(){try{await navigator.clipboard.writeText(ACCOUNT);setCopied(true);toast.success("Account number copied");setTimeout(()=>setCopied(false),2000)}catch{toast.error("Could not copy")}}

 async function notify(){
  if(!user||!s)return;
  if(!s.phone)return toast.error("WhatsApp number not found");
  if(pending)return toast.info("Payment notification already pending");
  setBusy("pay");
  const {error}=await supabase.from("premium_payment_requests").insert({user_id:user.id,full_name:s.fullName,phone:s.phone,amount:PRICE,payment_description:`StatusConnect + ${s.phone}`,status:"pending"});
  setBusy("");if(error)return toast.error(error.message);
  await logAudit("premium_payment_notification",{amount:PRICE,phone:s.phone});
  toast.success("Payment notification sent");load();
 }

 async function community(){
  if(!s||!user)return;setBusy("new");
  try{
   const {data:old}=await supabase.from("user_downloaded_contacts").select("contact_id").eq("user_id",user.id);
   const ids=(old||[]).map(x=>x.contact_id);
   let q=supabase.from("profiles").select("id,contact_seq,phone,last_login_at,registration_date").eq("status","approved").neq("id",user.id);
   if(ids.length)q=q.not("id","in",`(${ids.join(",")})`);
   const {data,error}=await q.order("contact_seq");if(error)throw error;
   const c=(data||[]).filter(active);
   if(c.length<MIN){toast.info(`Only ${c.length} new contacts available. Minimum is ${MIN}.`);return}
   downloadVcf(`status-connect-${c.length}.vcf`,generateVcf(c));
   await save(c.map(x=>x.id),s.first?"first_community":"new");
   toast.success(`Downloaded ${c.length} contacts`);
  }catch(e){toast.error(e instanceof Error?e.message:"Download failed")}finally{setBusy("")}
 }

 async function network(){
  if(!s||!user)return;setBusy("network");
  try{
   const c=[...new Map(ds.filter(x=>x.phone&&!saved.has(x.user_id)).map(x=>[x.user_id,x])).values()];
   if(!c.length)return toast.info("No new reciprocal contacts");
   downloadVcf(`status-connect-network-${c.length}.vcf`,generateNamedVcf(c.map(x=>({name:`Status Connect ${x.user_code}`,phone:x.phone}))));
   await save(c.map(x=>x.user_id),"reciprocal");toast.success(`Downloaded ${c.length} reciprocal contacts`);
  }catch(e){toast.error(e instanceof Error?e.message:"Download failed")}finally{setBusy("")}
 }

 async function save(ids:string[],type:any){
  for(let i=0;i<ids.length;i+=500)await supabase.from("user_downloaded_contacts").upsert(ids.slice(i,i+500).map(id=>({user_id:user!.id,contact_id:id})),{onConflict:"user_id,contact_id",ignoreDuplicates:true});
  await supabase.from("downloads").insert({user_id:user!.id,download_type:type,from_version:s!.lastDownloadVersion,to_version:Math.max(s!.latestVersion,s!.lastDownloadVersion),contact_count:ids.length});
  await supabase.from("profiles").update({last_download_version_number:Math.max(s!.lastDownloadVersion,s!.latestVersion),last_download_date:new Date().toISOString(),total_contacts_received:s!.downloaded+ids.length}).eq("id",user!.id);
  await logAudit(`download_${type}`,{count:ids.length});load();
 }

 if(!s)return <p className="text-sm text-muted-foreground">Loading…</p>;
 if(s.status==="suspended")return <div className="text-center py-10"><Clock className="mx-auto h-10 w-10"/><h1 className="text-2xl font-semibold mt-3">Account suspended</h1><p className="text-sm text-muted-foreground">Contact an administrator.</p></div>;

 const premium=s.membership==="premium",can=s.newAvailable>=MIN;
 const reciprocal=new Set(ds.filter(x=>x.phone&&!saved.has(x.user_id)).map(x=>x.user_id)).size;

 return <div className="space-y-6">
  <header>
   <p className="text-sm text-muted-foreground">Welcome back</p>
   <div className="flex flex-wrap items-center gap-2">
    <h1 className="text-2xl font-semibold">{s.fullName}</h1>
    <span className="rounded-full px-2.5 py-0.5 text-xs bg-primary/10">
     {premium?<><Crown className="inline h-3 w-3 mr-1"/>Premium member</>:<><ShieldCheck className="inline h-3 w-3 mr-1"/>Freemium member</>}
    </span>
   </div>
   <p className="text-sm text-muted-foreground">Your ID: <b>{s.userCode}</b></p>
  </header>

  <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
   <h2 className="font-semibold flex items-center gap-2"><Crown className="h-5 w-5"/>Premium Membership</h2>
   {premium?<p className="text-sm mt-2">You are already Premium. You can access your reciprocal network.</p>:<p className="text-sm mt-2">Upgrade for <b>₦{PRICE.toLocaleString()} / 30 days</b> and get access to your reciprocal network — the people who received your number.</p>}
   <div className="grid sm:grid-cols-3 gap-3 mt-4">
    <div className="border rounded-lg p-3 bg-card"><small>Bank</small><b className="block">{BANK}</b></div>
    <div className="border rounded-lg p-3 bg-card"><small>Account Name</small><b className="block">{NAME}</b></div>
    <div className="border rounded-lg p-3 bg-card"><small>Account Number</small><b className="block">{ACCOUNT}</b><button onClick={copy} className="text-primary text-xs mt-1">{copied?<><CheckCircle className="inline h-3 w-3"/> Copied</>:<><Copy className="inline h-3 w-3"/> Copy</>}</button></div>
   </div>
   {!premium&&<><p className="text-xs text-muted-foreground mt-3">Payment description: <b>StatusConnect + your registered WhatsApp number</b>.</p><Button className="mt-3" onClick={notify} disabled={!!busy||pending}>{busy==="pay"?"Sending…":pending?"Payment Pending":"I've Made the Payment"}</Button></>}
  </div>

  <div className="rounded-lg border bg-card p-4">
   <p className="text-xs uppercase text-primary font-semibold">{premium?"Your Reciprocal Network":"Contacts Ready to Save"}</p>
   <p className="text-2xl font-semibold mt-1">{premium?`${ds.length} members saved your number`:`${s.newAvailable} new contacts available`}</p>
  </div>

  <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
   <Stat label="Approved members" v={s.total}/><Stat label="Version" v={`v${s.latestVersion}`}/><Stat label="Your last version" v={s.lastDownloadVersion?`v${s.lastDownloadVersion}`:"—"}/><Stat label="New contacts" v={s.newAvailable}/><Stat label="Contacts received" v={s.downloaded}/><Stat label="Saved your number" v={ds.length}/><Stat label="Last download" v={s.lastDownloadDate?new Date(s.lastDownloadDate).toLocaleDateString():"—"}/><Stat label="Registered" v={s.registrationDate?new Date(s.registrationDate).toLocaleDateString():"—"}/>
  </div>

  <div className="grid gap-3 sm:grid-cols-2">
   <Button size="lg" disabled={!!busy||(!premium&&!can)} onClick={premium?network:community}>
    {premium?<Crown className="mr-2 h-4 w-4"/>:<RefreshCcw className="mr-2 h-4 w-4"/>}
    {busy?"Preparing…":premium?`Download Reciprocal Network (${reciprocal})`:`Download Community Contacts (${s.newAvailable})`}
   </Button>
   <Link to="/download-history"><Button size="lg" variant="ghost" className="w-full"><History className="mr-2 h-4 w-4"/>Download History</Button></Link>
  </div>

  <div className="rounded-lg border bg-card">
   <div className="p-4 border-b flex justify-between"><span><Bell className="inline h-4 w-4 mr-2"/>Who saved your contact</span><b>{ds.length}</b></div>
   {!ds.length?<p className="p-4 text-sm text-muted-foreground">No one has received your contact yet.</p>:<ul className="divide-y">{ds.map(x=><li key={x.id} className="p-4 flex justify-between"><div><b className="font-mono">{premium?x.phone:mask(x.phone)}</b><p className="text-xs text-muted-foreground">ID {x.user_code}{premium&&x.full_name?` · ${x.full_name}`:""}</p></div><small>{new Date(x.downloaded_at).toLocaleDateString()}</small></li>)}</ul>}
  </div>
 </div>
}

function Stat({label,v}:{label:string;v:any}){return <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold">{v}</p></div>}
