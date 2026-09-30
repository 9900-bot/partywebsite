import Link from "next/link";
import { states } from "@/data/states";
import { IndiaMap } from "./india-map";

export function StatesExplorer() {
  return <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"><div><IndiaMap /><p className="mt-3 text-xs leading-5 text-[#5b6475]">Boundaries: Survey of India-derived administrative boundary release. For geographic navigation only.</p></div><aside aria-labelledby="state-list-heading" className="border border-[#dfe4eb] bg-white"><div className="border-b border-[#dfe4eb] p-5"><span className="eyebrow">Accessible navigation</span><h2 id="state-list-heading" className="mt-2 text-xl font-black tracking-[-.03em]">States and union territories</h2><p className="mt-2 text-sm leading-6 text-[#5b6475]">Choose a name to open its information page.</p></div><ul className="grid max-h-[620px] grid-cols-1 overflow-auto p-2 sm:grid-cols-2 lg:grid-cols-1">{states.map((state) => <li key={state.id}><Link href={`/states/${state.slug}`} className="group flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold hover:bg-[#fdf5f2] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#b6402c]"><span>{state.name}</span><span className="text-xs text-[#7a8494] group-hover:text-[#b6402c]">{state.code}</span></Link></li>)}</ul></aside></div>;
}
