import{createFileRoute,useNavigate,Link}from"@tanstack/react-router";
import{useEffect,useState}from"react";
import{supabase}from"@/integrations/supabase/client";
import{useAuth}from"@/lib/auth-context";
import{Button}from"@/components/ui/button";
import{Input}from"@/components/ui/input";
import{toast}from"sonner";
import{logAudit}from"@/lib/audit";
import{toYouTubeEmbed}from"@/lib/youtube";

export const Route=createFileRoute("/_authenticated/admin")({component:AdminPage});

const PASS="SC-ADMIN-2026",KEY="sc_admin_gate_ok";

type Status="pending"|"approved"|"rejected"|"suspended";
type Membership="freemium"|"premium";

type User={
 id:string;user_code:string;full_name:string;phone:string;country:string;
 status:Status;membership:Membership;registration_date:string;
 total_contacts_received:number
};

type Pay={
 id:string;user_id:string;full_name:string;phone:string;amount:number;
 payment_description:string;status:string;created_at:string
};

function Gate({unlock}:{unlock:()=>void}){
 const[c,setC]=useState("");
 const check=()=>c===PASS?(sessionStorage.setItem(KEY,"1"),unlock()):toast.error("Incorrect passcode");
 return <div className="max-w-sm mx-auto py-16 space-y-4">
  <h1 className="text-2xl font-semibold">Admin access</h1>
  <p className="text-sm text-muted-foreground">Enter the admin passcode.</p>
  <Input type="password" placeholder="Passcode" value={c} onChange={e=>setC(e.target.value)} onKeyDown={e=>e.key==="Enter"&&check()}/>
  <Button className="w-full" onClick={check}>Unlock</Button>
 </div>
}

function AdminPage(){
 const{user,loading}=useAuth(),nav=useNavigate();
 const[users,setUsers]=useState<User[]>([]),[payments,setPayments]=useState<Pay[]>([]);
 const[activity,setActivity]=useState<any[]>([]),[search,setSearch]=useState(""),[filter,setFilter]=useState<Status|"all">("all");
 const[video,setVideo]=useState(""),[saving,setSaving]=useState(false),[publishing,setPublishing]=useState(false);
 const[unlocked,setUnlocked]=useState(()=>typeof window!=="undefined"&&sessionStorage.getItem(KEY)==="1");
 const[stats,setStats]=useState({total:0,approved:0,pending:0,rejected:0,suspended:0,premium:0,version:0,downloads:0,today:0,week:0,month:0});

 useEffect(()=>{if(!loading&&!user)nav({to:"/auth"})},[loading,user,nav]);

 async function load(){
  const now=Date.now(),d=new Date(now-86400000).toISOString(),w=new Date(now-604800000).toISOString(),m=new Date(now-2592000000).toISOString();

  const[q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,q11]=await Promise.all([
   supabase.from("profiles").select("*",{count:"exact",head:true}),
   supabase.from("profiles").select("*",{count:"exact",head:true}).eq("status","approved"),
   supabase.from("profiles").select("*",{count:"exact",head:true}).eq("status","pending"),
   supabase.from("profiles").select("*",{count:"exact",head:true}).eq("status","rejected"),
   supabase.from("profiles").select("*",{count:"exact",head:true}).eq("status","suspended"),
   supabase.from("profiles").select("*",{count:"exact",head:true}).eq("membership","premium"),
   supabase.from("contact_versions").select("version_number").order("version_number",{ascending:false}).limit(1).maybeSingle(),
   supabase.from("downloads").select("*",{count:"exact",head:true}),
   supabase.from("profiles").select("*",{count:"exact",head:true}).gte("registration_date",d),
   supabase.from("profiles").select("*",{count:"exact",head:true}).gte("registration_date",w),
   supabase.from("profiles").select("*",{count:"exact",head:true}).gte("registration_date",m)
  ]);

  setStats({
   total:q1.count||0,approved:q2.count||0,pending:q3.count||0,rejected:q4.count||0,
   suspended:q5.count||0,premium:q6.count||0,version:q7.data?.version_number||0,
   downloads:q8.count||0,today:q9.count||0,week:q10.count||0,month:q11.count||0
  });

  const{data:us}=await supabase.from("profiles").select("id,user_code,full_name,phone,country,status,membership,registration_date,total_contacts_received").order("registration_date",{ascending:false}).limit(300);
  setUsers((us||[]) as User[]);

  const{data:ps}=await supabase.from("premium_payment_requests").select("id,user_id,full_name,phone,amount,payment_description,status,created_at").order("created_at",{ascending:false}).limit(100);
  setPayments((ps||[]) as Pay[]);

  const{data:logs}=await supabase.from("audit_log").select("id,action,created_at,user_id").order("created_at",{ascending:false}).limit(20);
  setActivity(logs||[]);

  const{data:set}=await supabase.from("app_settings").select("value").eq("key","tutorial_video_url").maybeSingle();
  setVideo((set?.value as string)||"");
 }

 useEffect(()=>{if(user&&unlocked)load()},[user?.id,unlocked]);

 async function approvePayment(p:Pay){
  const{error}=await supabase.from("profiles").update({membership:"premium"}).eq("id",p.user_id);
  if(error)return toast.error(error.message);

  const{error:e}=await supabase.from("premium_payment_requests").update({status:"approved"}).eq("id",p.id);
  if(e)return toast.error(e.message);

  await logAudit("admin_approved_premium_payment",{target:p.user_id,amount:p.amount});
  toast.success(`${p.full_name} is now Premium`);
  load();
 }

 async function rejectPayment(p:Pay){
  const{error}=await supabase.from("premium_payment_requests").update({status:"rejected"}).eq("id",p.id);
  if(error)return toast.error(error.message);
  await logAudit("admin_rejected_premium_payment",{target:p.user_id});
  toast.success("Payment request rejected");
  load();
 }

 async function publish(){
  setPublishing(true);
  try{
   const{error}=await supabase.rpc("publish_new_version");
   if(error)throw error;
   await logAudit("admin_publish_version");toast.success("New contact version published");load();
  }catch(e){toast.error(e instanceof Error?e.message:"Failed")}finally{setPublishing(false)}
 }

 async function saveVideo(){
  if(video.trim()&&!toYouTubeEmbed(video))return toast.error("Invalid YouTube link");
  setSaving(true);
  const{error}=await supabase.from("app_settings").upsert({key:"tutorial_video_url",value:video.trim()},{onConflict:"key"});
  setSaving(false);
  if(error)return toast.error(error.message);
  await logAudit("admin_set_tutorial_video");toast.success("Tutorial video saved");
 }

 async function status(u:User,n:Status){
  const{error}=await supabase.from("profiles").update({status:n}).eq("id",u.id);
  if(error)return toast.error(error.message);
  await logAudit(`admin_status_${n}`,{target:u.id});toast.success(`${u.user_code} → ${n}`);load();
 }

 async function membership(u:User){
  const n=u.membership==="premium"?"freemium":"premium";
  const{error}=await supabase.from("profiles").update({membership:n}).eq("id",u.id);
  if(error)return toast.error(error.message);
  await logAudit(`admin_membership_${n}`,{target:u.id});toast.success(`${u.user_code} → ${n}`);load();
 }

 async function del(u:User){
  if(!confirm(`Delete ${u.user_code} — ${u.full_name}?`))return;
  const{error}=await supabase.from("profiles").delete().eq("id",u.id);
  if(error)return toast.error(error.message);
  await logAudit("admin_delete_user",{target:u.id});toast.success("User deleted");load();
 }

 function csv(){
  const h=["user_code","full_name","phone","country","status","membership","registration_date","total_contacts_received"];
  const r=users.map(u=>h.map(k=>JSON.stringify((u as any)[k]??"")).join(","));
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([[h.join(","),...r].join("\n")],{type:"text/csv"}));a.download="status-connect-users.csv";a.click();
 }

 if(loading||!user)return <p>Loading…</p>;
 if(!unlocked)return <Gate unlock={()=>setUnlocked(true)}/>;

 const filtered=users.filter(u=>(filter==="all"||u.status===filter)&&(!search||[u.user_code,u.full_name,u.phone].some(x=>x.toLowerCase().includes(search.toLowerCase()))));
 const pendingPayments=payments.filter(p=>p.status==="pending");

 return <div className="space-y-6">

  <div className="flex justify-between flex-wrap gap-3">
   <h1 className="text-2xl font-semibold">Admin</h1>
   <Button onClick={publish} disabled={publishing}>{publishing?"Publishing…":"Publish new contact version"}</Button>
  </div>

  {/* PREMIUM PAYMENT NOTIFICATIONS */}
  <div className={`rounded-lg border p-4 ${pendingPayments.length?"border-yellow-500 bg-yellow-500/5":"bg-card"}`}>
   <div className="flex justify-between items-center">
    <div>
     <h2 className="font-semibold">Premium Payment Requests</h2>
     <p className="text-sm text-muted-foreground">
      {pendingPayments.length?`${pendingPayments.length} payment notification${pendingPayments.length===1?"":"s"} waiting for approval.`:"No pending payment notifications."}
     </p>
    </div>
    <span className="text-xl font-bold">{pendingPayments.length}</span>
   </div>

   {pendingPayments.length>0&&<div className="mt-4 space-y-3">
    {pendingPayments.map(p=><div key={p.id} className="rounded-lg border bg-card p-4">
     <p className="font-semibold">{p.full_name}</p>
     <p className="text-sm">WhatsApp: <b>{p.phone}</b></p>
     <p className="text-sm">Amount: <b>₦{Number(p.amount).toLocaleString()}</b></p>
     <p className="text-xs text-muted-foreground mt-1">{p.payment_description}</p>
     <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
     <div className="flex gap-2 mt-3">
      <Button size="sm" onClick={()=>approvePayment(p)}>Approve & Make Premium</Button>
      <Button size="sm" variant="destructive" onClick={()=>rejectPayment(p)}>Reject</Button>
     </div>
    </div>)}
   </div>}
  </div>

  <div className="rounded-lg border bg-card p-4 space-y-3">
   <h2 className="font-semibold">Tutorial video</h2>
   <div className="flex flex-wrap gap-2">
    <Input value={video} onChange={e=>setVideo(e.target.value)} placeholder="YouTube link" className="max-w-md"/>
    <Button onClick={saveVideo} disabled={saving}>{saving?"Saving…":"Save video"}</Button>
   </div>
   {toYouTubeEmbed(video)&&<iframe src={toYouTubeEmbed(video)!} className="w-full max-w-md aspect-video rounded" allowFullScreen/>}
  </div>

  <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
   <Stat label="Total users" value={stats.total}/><Stat label="Approved" value={stats.approved}/>
   <Stat label="Pending" value={stats.pending}/><Stat label="Rejected" value={stats.rejected}/>
   <Stat label="Suspended" value={stats.suspended}/><Stat label="Premium" value={stats.premium}/>
   <Stat label="Version" value={`v${stats.version}`}/><Stat label="Downloads" value={stats.downloads}/>
   <Stat label="Today / Week / Month" value={`${stats.today} / ${stats.week} / ${stats.month}`}/>
  </div>

  <div className="rounded-lg border bg-card">
   <div className="p-4 flex flex-wrap gap-2 border-b">
    <Input placeholder="Search code, name, phone…" value={search} onChange={e=>setSearch(e.target.value)} className="max-w-sm"/>
    <select value={filter} onChange={e=>setFilter(e.target.value as any)} className="h-9 rounded border bg-background px-2 text-sm">
     <option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="suspended">Suspended</option>
    </select>
    <Button variant="outline" size="sm" onClick={csv}>Export CSV</Button>
   </div>

   <div className="overflow-x-auto">
    <table className="w-full text-sm">
     <thead><tr className="border-b text-left">{["Code","Name","Phone","Country","Status","Membership","Joined","Actions"].map(x=><th className="p-3" key={x}>{x}</th>)}</tr></thead>
     <tbody>
      {filtered.map(u=><tr key={u.id} className="border-b">
       <td className="p-3 font-mono">{u.user_code}</td><td className="p-3">{u.full_name}</td><td className="p-3">{u.phone}</td><td className="p-3">{u.country}</td>
       <td className="p-3"><Badge status={u.status}/></td><td className="p-3">{u.membership}</td>
       <td className="p-3">{new Date(u.registration_date).toLocaleDateString()}</td>
       <td className="p-3 whitespace-nowrap">
        {u.status!=="approved"&&<Button size="sm" variant="ghost" onClick={()=>status(u,"approved")}>Approve</Button>}
        {u.status!=="rejected"&&<Button size="sm" variant="ghost" onClick={()=>status(u,"rejected")}>Reject</Button>}
        {u.status!=="suspended"&&<Button size="sm" variant="ghost" onClick={()=>status(u,"suspended")}>Suspend</Button>}
        <Button size="sm" variant="ghost" onClick={()=>membership(u)}>{u.membership==="premium"?"Downgrade":"Make premium"}</Button>
        <Link to="/admin/user/$id" params={{id:u.id}}><Button size="sm" variant="ghost">View</Button></Link>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={()=>del(u)}>Delete</Button>
       </td>
      </tr>)}
      {!filtered.length&&<tr><td colSpan={8} className="p-6 text-center">No users</td></tr>}
     </tbody>
    </table>
   </div>
  </div>

  <div className="rounded-lg border bg-card p-4">
   <h2 className="font-semibold mb-2">Recent activity</h2>
   <ul className="text-sm divide-y">
    {activity.map(a=><li key={a.id} className="py-2 flex justify-between"><span>{new Date(a.created_at).toLocaleString()}</span><span>{a.action}</span></li>)}
    {!activity.length&&<li className="py-4 text-center">No activity yet</li>}
   </ul>
  </div>
 </div>
}

function Badge({status}:{status:Status}){
 return <span className={`px-2 py-0.5 rounded text-xs ${
  status==="approved"?"bg-primary/10 text-primary":
  status==="pending"?"bg-yellow-500/10 text-yellow-700":
  status==="rejected"?"bg-destructive/10 text-destructive":"bg-muted"
 }`}>{status}</span>
}

function Stat({label,value}:{label:string;value:any}){
 return <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>
                                    }
