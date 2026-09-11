"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function AuthCallbackPage(){
  const [error,setError]=useState("");
  useEffect(()=>{
    const client=supabase;
    if(!client)return;
    const finish=async()=>{
      const code=new URLSearchParams(window.location.search).get("code");
      if(!code){window.location.replace("/post-property?confirmed=1");return;}
      const {data,error}=await client.auth.exchangeCodeForSession(code);
      if(error){setError(error.message);return;}
      if(data.user) await client.from("profiles").upsert({id:data.user.id,role:"buyer"},{onConflict:"id",ignoreDuplicates:true});
      window.location.replace("/post-property?confirmed=1");
    };
    finish();
  },[]);
  return <main className="flex min-h-screen items-center justify-center bg-[#f7fafb] px-6 text-[#102638]"><div className="w-full max-w-md rounded-3xl border border-[#dfe9ed] bg-white p-8 text-center shadow-sm"><img src="/unlivo-logo.svg" alt="UNLIVO" className="mx-auto w-[210px]"/><h1 className="mt-8 text-2xl font-extrabold">Confirming your account</h1>{error?<><p className="mt-3 text-sm text-[#8b4b4b]">{error}</p><a href="/post-property" className="mt-6 inline-flex rounded-xl bg-[#123b53] px-6 py-3 text-sm font-bold text-white">Return to UNLIVO</a></>:<p className="mt-3 text-sm text-[#687987]">Please wait while we securely finish signing you in…</p>}</div></main>;
}