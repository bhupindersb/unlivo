"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function ReviewerLayout({children}:{children:ReactNode}){
 const pathname=usePathname();
 const logout=async()=>{if(supabase)await supabase.auth.signOut();window.location.href="/reviewer/login"};
 return <>{children}{pathname!=="/reviewer/login"&&<button type="button" onClick={logout} className="fixed right-5 top-[92px] z-[60] inline-flex items-center gap-2 rounded-full border border-[#ead8d8] bg-white px-4 py-2 text-sm font-bold text-[#9b4d4d] shadow-md hover:border-[#d28b8b] hover:bg-[#fff8f8] lg:right-8 lg:top-[92px]"><LogOut size={16}/>Logout</button>}</>;
}
