const footerLink = "text-sm leading-6 text-[#b8c8d2] transition hover:text-[#62d9c1]";

export default function SiteFooter() {
  return (
    <footer id="resources" className="border-t border-white/10 bg-[#071d2d] text-white">
      <div className="container py-14 sm:py-16">
        <div className="grid justify-items-center gap-11 text-center sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr] lg:justify-items-start lg:gap-12 lg:text-left">
          <div className="mx-auto max-w-sm lg:mx-0">
            <a href="/" className="inline-block w-[170px] rounded-lg bg-white p-2" aria-label="UNLIVO home">
              <img src="/unlivo-logo.svg" alt="UNLIVO - property discovery and buyer matching" className="w-full" />
            </a>
            <p className="mt-5 text-sm leading-7 text-[#b8c8d2]">
              Find the right property. Find the right buyer. Share what you need and discover relevant property options across the UNLIVO marketplace.
            </p>
            <a href="/post-requirement" className="mx-auto mt-6 inline-flex items-center rounded-xl lg:mx-0 bg-[#13c6a3] px-5 py-3 text-sm font-bold text-[#06251f] transition hover:bg-[#62d9c1]">
              Post Your Requirement <span aria-hidden="true" className="ml-2">→</span>
            </a>
          </div>

          <div>
            <h2 className="text-sm font-extrabold tracking-wide text-white">Explore Properties</h2>
            <ul className="mt-5 space-y-3">
              <li><a className={footerLink} href="/properties">Browse all properties</a></li>
              <li><a className={footerLink} href="/properties">Buy property</a></li>
              <li><a className={footerLink} href="/properties">Explore rental properties</a></li>
              <li><a className={footerLink} href="/post-requirement">Post a property requirement</a></li>
              <li><a className={footerLink} href="/post-property">List a property for sale or rent</a></li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-extrabold tracking-wide text-white">Popular Locations</h2>
            <ul className="mt-5 space-y-3">
              <li><a className={footerLink} href="/locations/mohali">Property in Mohali</a></li>
              <li><a className={footerLink} href="/locations/zirakpur">Property in Zirakpur</a></li>
              <li><a className={footerLink} href="/locations/chandigarh">Property in Chandigarh</a></li>
              <li><a className={footerLink} href="/locations/new-chandigarh">Property in New Chandigarh</a></li>
              <li><a className={footerLink} href="/properties">Properties across the Tricity</a></li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-extrabold tracking-wide text-white">Connect with UNLIVO</h2>
            <ul className="mt-5 space-y-3">
              <li><a className={footerLink} href="/for-brokers">For real estate brokers</a></li>
              <li><a className={footerLink} href="/login">Login to your account</a></li>
              <li><a className={footerLink} href="/signup">Create an account</a></li>
              <li><a className={footerLink} href="/for-brokers">Broker listing platform</a></li>
              <li><a className={footerLink} href="/post-requirement">Get matched with properties</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 border-t border-white/10 pt-6 text-center text-xs text-[#91a5b2] sm:flex-row sm:items-center sm:justify-between lg:text-left">
          <p>© {new Date().getFullYear()} UNLIVO. Find the right property. Find the right buyer.</p>
          <p>Property discovery and buyer matching across Mohali, Chandigarh and Zirakpur.</p>
        </div>
      </div>
    </footer>
  );
}
