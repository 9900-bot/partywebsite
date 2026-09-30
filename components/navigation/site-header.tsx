"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [["Home", "/"], ["Political Parties", "/parties"], ["States", "/states"], ["Recent Updates", "/updates"], ["Communications", "/communications"], ["Admin", "/admin"]] as const;
export function SiteHeader() {
  const pathname = usePathname();
  return <header className="border-b border-[#dfe4eb] bg-[#f7f8fa]"><div className="shell flex min-h-18 flex-wrap items-center justify-between gap-3 py-4"><Link href="/" className="font-black tracking-[-.06em] text-xl text-[#10223d]">CIVIC <span className="text-[#b6402c]">ATLAS</span><small className="ml-2 align-middle text-[10px] tracking-[.16em] text-[#5b6475]">INDIA</small></Link><nav aria-label="Main navigation" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-[#5b6475]">{links.map(([label, href]) => <Link key={href} href={href} className={pathname === href ? "text-[#b6402c]" : "transition hover:text-[#10223d]"}>{label}</Link>)}</nav></div></header>;
}
