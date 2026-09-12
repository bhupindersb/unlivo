"use client";

import { useEffect, useState } from "react";
import { ImagePlus, LogIn, Upload, X } from "lucide-react";
import SiteHeader from "../../components/site-header";
import SiteFooter from "../../components/site-footer";
import PropertyLocation from "../../components/property-location";
import { supabase } from "../../lib/supabase";

const input = "w-full rounded-xl border border-[#d7e3e8] bg-white px-4 py-3 text-sm text-[#102638] outline-none focus:border-[#0bb89b] focus:ring-2 focus:ring-[#0bb89b]/10";
const label = "mb-2 block text-xs font-bold uppercase tracking-[1.3px] text-[#547083]";

type F = {
  purpose: string; category: string; property_type: string; title: string; description: string;
  price: string; rent_monthly: string; bedrooms: string; bathrooms: string; area_sqft: string;
  plot_area_sqyd: string; furnishing: string; possession: string; parking_spaces: string;
  address_line: string; city: string; locality: string; pincode: string;
  latitude: number | null; longitude: number | null; place_id: string | null;
};

const initial: F = {
  purpose: "sale", category: "residential", property_type: "Apartment", title: "", description: "",
  price: "", rent_monthly: "", bedrooms: "", bathrooms: "", area_sqft: "", plot_area_sqyd: "",
  furnishing: "", possession: "ready_to_move", parking_spaces: "", address_line: "", city: "",
  locality: "", pincode: "", latitude: null, longitude: null, place_id: null,
};

type Preview = { file: File; url: string };

export default function PostPropertyPage() {
  const [form, setForm] = useState(initial);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [files, setFiles] = useState<Preview[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("confirmed") === "1") setMessage("Email confirmed successfully. Your account is ready — you can now publish your property.");
    if (q.get("mode") === "login") setMode("login");
  }, []);

  const set = (key: keyof F, value: any) => setForm((current) => ({ ...current, [key]: value }));

  const ensure = async (id: string) => {
    if (!supabase) return;
    const result = await supabase.from("profiles").upsert({ id, role: "owner" }, { onConflict: "id", ignoreDuplicates: true });
    if (result.error) throw result.error;
  };

  const authenticate = async () => {
    if (!supabase) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/auth/confirm` } });
      if (result.error) throw result.error;
      if (result.data.session && result.data.user) {
        await ensure(result.data.user.id);
        setUser(result.data.user);
        setMessage(mode === "login" ? "Signed in successfully." : "Account created successfully. You can now publish your property.");
      } else {
        setMessage("Account created. Please confirm your email using the link we sent you. After confirmation, you will return to UNLIVO automatically.");
      }
    } catch (e: any) {
      setError(e?.message || "We could not complete your request.");
    } finally { setSaving(false); }
  };

  const choose = (incoming: FileList | null) => {
    if (!incoming) return;
    const selected = Array.from(incoming).filter((file) => file.type.startsWith("image/"));
    const all = [...files.map((item) => item.file), ...selected];
    const unique = all.filter((file, index, array) => array.findIndex((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified) === index).slice(0, 10);
    setFiles(unique.map((file) => ({ file, url: URL.createObjectURL(file) })));
  };

  const remove = (index: number) => setFiles((current) => {
    URL.revokeObjectURL(current[index].url);
    return current.filter((_, itemIndex) => itemIndex !== index);
  });

  const save = async (status: "draft" | "pending_review") => {
    if (!supabase || !user) { setError("Please create an account or sign in first."); return; }
    if (!form.title.trim() || !form.property_type.trim() || !form.city.trim() || !form.locality.trim()) {
      setError("Please complete the title, property type, city and locality."); return;
    }
    if (form.purpose === "sale" && !form.price) { setError("Please enter the sale price."); return; }
    if (form.purpose === "rent" && !form.rent_monthly) { setError("Please enter the monthly rent."); return; }

    setSaving(true); setError(""); setMessage("");
    try {
      await ensure(user.id);
      const payload: any = {
        listed_by: user.id, owner_id: user.id, purpose: form.purpose, category: form.category,
        property_type: form.property_type, title: form.title.trim(), description: form.description.trim() || null,
        price: form.purpose === "sale" ? Number(form.price) || null : null,
        rent_monthly: form.purpose === "rent" ? Number(form.rent_monthly) || null : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null, bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        area_sqft: form.area_sqft ? Number(form.area_sqft) : null, plot_area_sqyd: form.plot_area_sqyd ? Number(form.plot_area_sqyd) : null,
        furnishing: form.furnishing || null, possession: form.possession || null,
        parking_spaces: form.parking_spaces ? Number(form.parking_spaces) : null,
        address_line: form.address_line || null, city: form.city, locality: form.locality,
        pincode: form.pincode || null, latitude: form.latitude, longitude: form.longitude, place_id: form.place_id, status,
      };

      const propertyResult = await supabase.from("properties").insert(payload).select("id").single();
      if (propertyResult.error) throw propertyResult.error;
      const propertyId = propertyResult.data.id;

      if (status === "pending_review") {
        const reviewResult = await supabase.from("property_reviews").insert({ property_id: propertyId, decision: "pending" });
        if (reviewResult.error) throw reviewResult.error;
      }

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index].file;
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${propertyId}/${crypto.randomUUID()}.${ext}`;
        const upload = await supabase.storage.from("property-media").upload(path, file, { cacheControl: "3600", upsert: false });
        if (upload.error) throw upload.error;
        const media = await supabase.from("property_media").insert({ property_id: propertyId, storage_path: path, media_type: "image", sort_order: index, is_cover: index === 0 });
        if (media.error) throw media.error;
      }

      if (status === "pending_review") {
        window.location.assign(`/post-property/confirmation?id=${propertyId}`);
        return;
      }

      setMessage("Draft saved successfully.");
      setForm(initial);
      files.forEach((file) => URL.revokeObjectURL(file.url));
      setFiles([]);
    } catch (e: any) {
      setError(e?.message || "We could not save the property.");
    } finally { setSaving(false); }
  };

  return (
    <main className="min-h-screen bg-[#f7fafb] text-[#102638]">
      <SiteHeader />
      <section className="container max-w-5xl py-10 lg:py-14">
        <div className="max-w-2xl"><p className="text-[11px] font-bold uppercase tracking-[3px] text-[#547083]">List with UNLIVO</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-1.5px]">Post a Property</h1><p className="mt-3 text-sm leading-6 text-[#687987]">Add your property once, keep control of your listing, and reach buyers and tenants searching on UNLIVO.</p></div>
        {message && <div className="mt-7 rounded-xl border border-[#bfe9df] bg-[#effbf8] px-4 py-3 text-sm font-semibold text-[#087f73]">{message}</div>}
        {error && <div className="mt-7 rounded-xl border border-[#efd0d0] bg-[#fff7f7] px-4 py-3 text-sm font-semibold text-[#8b4b4b]">{error}</div>}

        {!user ? (
          <div className="mt-8 rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm lg:p-8">
            <div className="flex items-start gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e9faf6] text-[#0b8f79]"><LogIn size={20} /></div><div><h2 className="text-xl font-extrabold">{mode === "signup" ? "Create an account to list" : "Sign in to list your property"}</h2><p className="mt-1 text-sm text-[#687987]">Your account keeps your listings, photos and enquiries connected.</p></div></div>
            <div className="mt-6 grid gap-4 md:grid-cols-2"><div><label className={label}>Email</label><input className={input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div><div><label className={label}>Password</label><input className={input} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></div></div>
            <button onClick={authenticate} disabled={saving || !email || !password} className="mt-5 cursor-pointer rounded-xl bg-[#123b53] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Please wait…" : mode === "signup" ? "Create Account" : "Sign In"}</button>
            <button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); setMessage(""); }} className="ml-4 cursor-pointer text-sm font-bold text-[#087f73]">{mode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}</button>
          </div>
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); save("pending_review"); }} className="mt-8 space-y-6">
            <div className="rounded-3xl border border-[#cfe9e4] bg-[#f1fbf8] p-5"><p className="text-sm font-extrabold text-[#087f73]">Your listing will be reviewed before it goes live.</p><p className="mt-1 text-sm leading-6 text-[#547083]">After you submit it, UNLIVO will place it in review. You’ll get a confirmation page with the listing link and its current review status.</p></div>

            <div className="rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm lg:p-8"><h2 className="text-xl font-extrabold">1. Listing basics</h2><div className="mt-6 grid gap-4 md:grid-cols-2">
              <div><label className={label}>Purpose</label><div className="grid grid-cols-2 gap-2">{[["sale", "For Sale"], ["rent", "For Rent"]].map(([value, text]) => <button type="button" key={value} onClick={() => set("purpose", value)} className={`cursor-pointer rounded-xl border px-4 py-3 text-sm font-bold ${form.purpose === value ? "border-[#0bb89b] bg-[#e9faf6] text-[#087f73]" : "border-[#d7e3e8]"}`}>{text}</button>)}</div></div>
              <div><label className={label}>Category</label><select className={input} value={form.category} onChange={(event) => set("category", event.target.value)}><option value="residential">Residential</option><option value="commercial">Commercial</option><option value="plot_land">Plots & Land</option><option value="project">Projects</option></select></div>
              <div><label className={label}>Property type</label><input className={input} value={form.property_type} onChange={(event) => set("property_type", event.target.value)} placeholder="Apartment, Villa, Office, Plot…" /></div>
              <div><label className={label}>{form.purpose === "sale" ? "Sale price (₹)" : "Monthly rent (₹)"}</label><input className={input} type="number" min="0" value={form.purpose === "sale" ? form.price : form.rent_monthly} onChange={(event) => set(form.purpose === "sale" ? "price" : "rent_monthly", event.target.value)} /></div>
              <div className="md:col-span-2"><label className={label}>Listing title</label><input className={input} value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="3 BHK Premium Apartment in Sector 88" /></div>
              <div className="md:col-span-2"><label className={label}>Description</label><textarea className={`${input} min-h-32`} value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Describe the property, condition, highlights and anything a buyer should know…" /></div>
            </div></div>

            <div className="rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm lg:p-8"><h2 className="text-xl font-extrabold">2. Property details</h2><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {form.category === "residential" && <><div><label className={label}>Bedrooms</label><input className={input} type="number" min="0" value={form.bedrooms} onChange={(event) => set("bedrooms", event.target.value)} /></div><div><label className={label}>Bathrooms</label><input className={input} type="number" min="0" value={form.bathrooms} onChange={(event) => set("bathrooms", event.target.value)} /></div></>}
              {form.category !== "plot_land" ? <div><label className={label}>Area (sq ft)</label><input className={input} type="number" min="0" value={form.area_sqft} onChange={(event) => set("area_sqft", event.target.value)} /></div> : <div><label className={label}>Plot area (sq yd)</label><input className={input} type="number" min="0" value={form.plot_area_sqyd} onChange={(event) => set("plot_area_sqyd", event.target.value)} /></div>}
              <div><label className={label}>Parking spaces</label><input className={input} type="number" min="0" value={form.parking_spaces} onChange={(event) => set("parking_spaces", event.target.value)} /></div>
              <div><label className={label}>Furnishing</label><select className={input} value={form.furnishing} onChange={(event) => set("furnishing", event.target.value)}><option value="">Select</option><option value="unfurnished">Unfurnished</option><option value="semi_furnished">Semi furnished</option><option value="fully_furnished">Fully furnished</option></select></div>
              <div><label className={label}>Possession</label><select className={input} value={form.possession} onChange={(event) => set("possession", event.target.value)}><option value="ready_to_move">Ready to move</option><option value="under_construction">Under construction</option><option value="pre_launch">Pre-launch</option><option value="resale">Resale</option></select></div>
            </div></div>

            <div className="rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm lg:p-8"><h2 className="text-xl font-extrabold">3. Location</h2><div className="mt-6"><label className={label}>Property address</label><PropertyLocation value={form.address_line} onChange={(value) => set("address_line", value)} onPlace={(place) => setForm((current) => ({ ...current, address_line: place.address, city: place.city, locality: place.locality, pincode: place.pincode, latitude: place.latitude, longitude: place.longitude, place_id: place.placeId }))} /></div><div className="mt-5 grid gap-4 md:grid-cols-3"><div><label className={label}>City</label><input className={input} value={form.city} onChange={(event) => set("city", event.target.value)} placeholder="Mohali" /></div><div><label className={label}>Locality / Sector</label><input className={input} value={form.locality} onChange={(event) => set("locality", event.target.value)} placeholder="Sector 88" /></div><div><label className={label}>Pincode</label><input className={input} value={form.pincode} onChange={(event) => set("pincode", event.target.value)} placeholder="140301" /></div></div></div>

            <div className="rounded-3xl border border-[#dfe9ed] bg-white p-6 shadow-sm lg:p-8"><div className="flex items-center justify-between"><div><h2 className="text-xl font-extrabold">4. Photos</h2><p className="mt-1 text-sm text-[#687987]">Add up to 10 photos. The first photo will be the cover.</p></div><ImagePlus size={22} className="text-[#0b8f79]" /></div><label className="mt-6 flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-[#cbdde3] bg-[#f8fbfc] px-6 py-10 text-center hover:border-[#0bb89b]"><input type="file" accept="image/*" multiple className="hidden" onChange={(event) => choose(event.target.files)} /><span><Upload className="mx-auto" size={24} /><span className="mt-2 block text-sm font-bold">Choose property photos</span><span className="mt-1 block text-xs text-[#687987]">JPG, PNG or WebP · up to 10 photos</span></span></label>{files.length > 0 && <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{files.map((file, index) => <div key={file.url} className="relative overflow-hidden rounded-xl border border-[#dfe9ed]"><img src={file.url} alt={`Property photo ${index + 1}`} className="aspect-square w-full object-cover" /><span className="absolute left-2 top-2 rounded bg-white/90 px-2 py-1 text-[10px] font-bold">{index === 0 ? "Cover" : `Photo ${index + 1}`}</span><button type="button" onClick={() => remove(index)} className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/90"><X size={14} /></button></div>)}</div>}</div>

            <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#687987]">By submitting, you confirm that the information and photos are accurate. Your listing will be reviewed before it becomes public.</p><div className="flex gap-3"><button type="button" disabled={saving} onClick={() => save("draft")} className="cursor-pointer rounded-xl border border-[#cbdde3] bg-white px-5 py-3 text-sm font-bold">Save Draft</button><button type="submit" disabled={saving} className="cursor-pointer rounded-xl bg-[#0bb89b] px-6 py-3 text-sm font-extrabold text-white">{saving ? "Submitting…" : "Submit for Review"}</button></div></div>
          </form>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
