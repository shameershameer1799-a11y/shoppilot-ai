import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/Card";
import { HorizontalBarChart, SplitPieChart, VerticalBarChart } from "@/components/business/Charts";

export default async function BusinessAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user || user.accountType !== "business") redirect("/login");

  // Demo-scope aggregates. Wire these to GROUP BY queries over `analytics_events`
  // for a production deployment (funnel by event_type, segments via customer_segments).
  const funnel = [
    { name: "Visits", value: 10000 }, { name: "Product Views", value: 6200 },
    { name: "Add to Cart", value: 2400 }, { name: "Checkout", value: 1500 }, { name: "Purchase", value: 1284 },
  ];
  const segments = [
    { name: "VIP", value: 18 }, { name: "Loyal", value: 26 }, { name: "High Intent", value: 22 },
    { name: "At Risk", value: 19 }, { name: "Cart Abandoner", value: 15 },
  ];
  const productPerf = [
    { name: "NovaBook", value: 412 }, { name: "SonicWave", value: 2100 }, { name: "Pulse X12", value: 980 },
    { name: "ChronoFit", value: 530 }, { name: "TrailPack", value: 340 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 font-display">Analytics</h1>
      <p className="text-sm mb-5 text-slate-500">Deeper look at store performance</p>
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <Card className="p-5"><h3 className="font-semibold text-sm mb-3">Conversion funnel</h3><HorizontalBarChart data={funnel} /></Card>
        <Card className="p-5"><h3 className="font-semibold text-sm mb-3">Customer segments</h3><SplitPieChart data={segments} /></Card>
      </div>
      <Card className="p-5"><h3 className="font-semibold text-sm mb-3">Product performance (reviews)</h3><VerticalBarChart data={productPerf} /></Card>
    </div>
  );
}
