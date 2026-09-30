"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { District } from "@/types/civic";

export function DistrictList({ stateSlug, districts }: { stateSlug: string; districts: District[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => districts.filter((district) => district.name.toLowerCase().includes(query.trim().toLowerCase())), [districts, query]);
  return <section aria-labelledby="districts-heading"><div className="flex flex-wrap items-end justify-between gap-5"><div><span className="eyebrow">Administrative hierarchy</span><h2 id="districts-heading" className="mt-2 text-3xl font-black tracking-[-.04em]">Districts</h2></div>{districts.length > 0 && <label className="w-full max-w-xs text-sm font-bold text-[#14213d]">Search districts<input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="District name" className="mt-2 w-full border border-[#b9c2ce] bg-white px-4 py-3 font-normal outline-none focus:border-[#b6402c] focus:ring-2 focus:ring-[#b6402c]/20" /></label>}</div>{districts.length === 0 ? <div className="mt-6 border-l-4 border-[#b6402c] bg-white p-6"><strong className="block">District data not yet verified</strong><p className="mt-1 text-[#5b6475]">No district records have been published for this state in Civic Atlas India.</p></div> : filtered.length === 0 ? <p className="mt-6 border border-[#dfe4eb] bg-white p-6 text-[#5b6475]">No districts match “{query}”.</p> : <div className="mt-6 grid gap-px border border-[#dfe4eb] bg-[#dfe4eb] sm:grid-cols-2">{filtered.map((district) => <Link key={district.id} href={`/states/${stateSlug}/districts/${district.slug}`} className="group bg-white p-6 hover:bg-[#fdf5f2] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#b6402c]"><span className="eyebrow">District</span><h3 className="mt-3 text-xl font-black tracking-[-.03em]">{district.name}</h3><span className="mt-6 block text-sm font-bold group-hover:text-[#b6402c]">View constituencies →</span></Link>)}</div>}</section>;
}
