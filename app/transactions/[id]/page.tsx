"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, FileText, Home, IndianRupee, XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import SiteHeader from "../../../components/site-header";
import SiteFooter from "../../../components/site-footer";
import { supabase } from "../../../lib/supabase";

type Transaction = {
  id:string; property_id:string; offer_id:string; buyer_id:string; seller_id:string;
  agreed_amount:number; status:"initiated"|"in_progress"|"completed"|"cancelled";
  started_at:string; completed_at:string|null; cancelled_at:string|null; notes:string|null;
};
type Property={id:string;title:string;city:string|null;locality:string|null;purpose:string;status:string;price:number|null;rent_monthly:number|null};
type Event={id:string;actor_id:string|null;action:string;from_status:string|null;to_status:string|null;amount:number|null;note:string|null;created_at:string};
type Participant={id:string;full_name:string|null;role:"buyer"|"seller"|null};

function money(value:number|null){return value==null?"—":`₹ ${Number(value).toLocaleString("en-IN",{maximumFractionDigits:0})}`;}
function statusLabel(s:string){return s==="initiated"?"Transaction Started":s==="in_progress"?"In Progress":s==="completed"?"Completed":"Cancelled";}
function eventLabel(e:Event){if(e.action==="offer_accepted")return "Offer accepted";if(e.action==="status_changed")return e.to_status?statusLabel(e.to_status):"Transaction updated";return e.action.replaceAll("_"," ").replace(/\b\w/g,l=>l.toUpperCase());}

export default function TransactionDetailPage(){
  const params=useParams<{id:string}>();
  const [transaction,setTransaction]=useState<Transaction|null>(null);
  const [property,setProperty]=useState<Property|null>(null);
  const [events,setEvents]=useState<Event[]>([]);
  const [participants,setParticipants]=useState<Participant[]>([]);
  const [userId,setUserId]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function load(){
    if(!supabase||!params?.id){setError("Transaction could not be loaded.");setLoading(false);return;}
    const {data:{session}}=await supabase.auth.getSession();
    const uid=session?.user?.id||null;
    if(!uid){window.location.href="/login";return;}
    setUserId(uid);
    const t=await supabase.from("property_transactions").select("id,property_id,offer_id,buyer_id,seller_id,agreed_amount,status,started_at,completed_at,cancelled_at,notes,buyer_confirmed_at,seller_confirmed_at").eq("id",params.id).maybeSingle();
    if(t.error||!t.data){setError(t.error?.message||"Transaction not found.");setLoading(false);return;}
    const row=t.data as Transaction;
    setTransaction(row);
    const [p,e,people]=await Promise.all([
      supabase.from("properties").select("id,title,city,locality,purpose,status,price,rent_monthly").eq("id",row.property_id).maybeSingle(),
      supabase.from("property_transaction_events").select("id,actor_id,action,from_status,to_status,amount,note,created_at").eq("transaction_id",row.id).order("created_at",{ascending:false}),
      supabase.rpc("get_property_transaction_participant_profiles",{p_transaction_id:row.id})
    ]);
    if(p.data)setProperty(p.data as Property);
    if(!e.error)setEvents((e.data||[]) as Event[]);
    if(!people.error)setParticipants((people.data||[]) as Participant[]);
    if(e.error)setError(e.error.message);
    setLoading(false);
  }

  useEffect(()=>{load()},[params?.id]);

  const updateStatus=async(next:"in_progress"|"cancelled")=>{if(!supabase||!transaction)return;const prompt=next==="cancelled"?"Cancel this transaction? This should only be used if the transaction will not proceed.":"Start the transaction and move it into the active transaction stage.";if(!window.confirm(prompt))return;setBusy(true);setMessage("");setError("");const r=await supabase.rpc("update_property_transaction_status",{p_transaction_id:transaction.id,p_status:next});if(r.error||r.data!==true)setError(r.error?.message||"This transaction status cannot be changed.");else{setMessage("Transaction updated.");await load()}setBusy(false);};
  const confirmCompletion=async()=>{if(!supabase||!transaction)return;if(!window.confirm(me==="buyer"?"Confirm that your purchase is completed. The seller will also need to confirm the sale before UNLIVO marks the transaction completed.":"Confirm that your sale is completed. The buyer will also need to confirm the purchase before UNLIVO marks the transaction completed."))return;setBusy(true);setMessage("");setError("");const r=await supabase.rpc("confirm_property_transaction",{p_transaction_id:transaction.id});if(r.error)setError(r.error.message);else{setMessage(r.data==="completed"?"Both parties have confirmed. Transaction completed.":me==="buyer"?"Purchase confirmed. Waiting for seller confirmation.":"Sale confirmed. Waiting for buyer confirmation.");await load()}setBusy(false);};
