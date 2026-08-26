import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MatchRing } from "@/components/ui/MatchRing";
import { Check, Sparkles } from "lucide-react";

const FEATURES = [
  { icon: "🤖", title: "AI Shopping Agent", desc: "Conversational search that understands budget, use case, and preferences — then explains every recommendation." },
  { icon: "📈", title: "Growth Assistant", desc: "Ask why sales dipped or who's about to churn. Get ranked opportunities with projected revenue impact." },
  { icon: "🎯", title: "Match Scoring", desc: "Every product and campaign comes with a transparent confidence score and the reasons behind it." },
  { icon: "🛒", title: "Smart Cart & Checkout", desc: "Coupons, saved items, and a 3-step checkout that gets out of the shopper's way." },
  { icon: "👥", title: "Customer Segmentation", desc: "Automatic segments scored from 0–100 and kept current." },
  { icon: "🔔", title: "Live Order Tracking", desc: "From Ordered to Delivered, with real-time status your customers can trust." },
];
const STEPS = [
  { n: 1, title: "Ask", desc: "Tell the AI what you need, in plain language." },
  { n: 2, title: "Compare", desc: "See ranked matches with clear reasons why." },
  { n: 3, title: "Checkout", desc: "Add to cart and pay in three quick steps." },
  { n: 4, title: "Track", desc: "Follow your order from warehouse to doorstep." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 grid md:grid-cols-2 gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-5">
            <Sparkles size={13} /> AI Co-Pilot, live in your store
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight mb-5 font-display">
            Your <span className="bg-gradient-to-r from-violet-600 to-teal-500 bg-clip-text text-transparent">AI Co-Pilot</span><br />
            for Smarter Commerce.
          </h1>
          <p className="text-lg mb-8 max-w-md leading-relaxed text-slate-500">
            ShopPilot AI helps shoppers find exactly what they need in seconds, and helps businesses grow with an AI analyst that never sleeps.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/signup?type=customer"><Button size="md" className="px-6 py-3">Start Shopping with AI</Button></Link>
            <Link href="/signup?type=business"><Button variant="ghost" className="px-6 py-3">Grow Your Business</Button></Link>
          </div>
          <div className="flex gap-8">
            {[["94%", "avg. AI match score"], ["3.2×", "faster to checkout"], ["₹1.8L+", "recovered per campaign"]].map(([v, l]) => (
              <div key={l}>
                <b className="text-2xl block font-display">{v}</b>
                <span className="text-xs text-slate-500">{l}</span>
              </div>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden shadow-xl">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-2 text-slate-500">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-300" /><span className="w-2 h-2 rounded-full bg-slate-300" /><span className="w-2 h-2 rounded-full bg-slate-300" />
            </div>
            ai-shop.chat
          </div>
          <div className="p-5 space-y-3">
            <div className="bg-violet-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-sm ml-auto w-fit" style={{ maxWidth: "85%" }}>
              Find a laptop under ₹80,000 for video editing
            </div>
            <div className="text-teal-500 text-xs flex items-center gap-1.5 font-mono"><Check size={13} /> Understanding requirements</div>
            <div className="text-teal-500 text-xs flex items-center gap-1.5 font-mono"><Check size={13} /> Searching products</div>
            <div className="text-teal-500 text-xs flex items-center gap-1.5 font-mono"><Check size={13} /> Ranking by fit</div>
            <div className="text-sm px-4 py-3 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950" style={{ maxWidth: "92%" }}>
              Found 3 strong matches. Here's the top pick:
              <div className="mt-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 flex items-center gap-3">
                <MatchRing score={94} />
                <div>
                  <b className="text-[13px] block">NovaBook Pro 14&quot;</b>
                  <span className="text-[11px] text-slate-500">✓ Within budget ✓ 16GB RAM ✓ Rated 4.7</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <div className="text-violet-600 text-xs font-semibold mb-3">FEATURES</div>
            <h2 className="text-3xl font-bold tracking-tight mb-2 font-display">Everything a modern store needs</h2>
            <p className="text-slate-500">One platform for the shopper&apos;s journey and the business behind it.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <Card key={f.title} className="p-6">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center text-lg mb-4">{f.icon}</div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-y border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <div className="text-violet-600 text-xs font-semibold mb-3">HOW IT WORKS</div>
            <h2 className="text-3xl font-bold tracking-tight font-display">From question to delivery</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold mx-auto mb-3 font-mono">{s.n}</div>
                <h4 className="font-semibold text-sm mb-1">{s.title}</h4>
                <p className="text-xs text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20 pt-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-gradient-to-br from-violet-600 to-violet-400 rounded-3xl p-14 text-center text-white">
            <h2 className="text-3xl font-bold mb-3 font-display">Ready to co-pilot your commerce?</h2>
            <p className="opacity-90 mb-6">Start free. No credit card needed.</p>
            <Link href="/signup"><Button variant="white">Start Shopping with AI</Button></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 dark:border-slate-700 py-8 text-center text-xs text-slate-500">
        © 2026 ShopPilot AI
      </footer>
    </div>
  );
}
