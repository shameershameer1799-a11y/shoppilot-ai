import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema, isDbConfigured } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { formatDistanceToNow } from "date-fns";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let items: any[] = [];
  if (isDbConfigured()) {
    const db = getDb();
    items = await db.query.notifications.findMany({ where: eq(schema.notifications.userId, user.id), orderBy: desc(schema.notifications.createdAt) });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 font-display">Notifications</h1>
      <p className="text-sm mb-5 text-slate-500">{items.filter((i) => !i.read).length} unread</p>
      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">No notifications yet.</Card>
      ) : items.map((n) => (
        <Card key={n.id} className={`p-4 mb-2.5 ${!n.read ? "border-violet-300" : ""}`}>
          <div className="flex justify-between items-start">
            <b className="text-sm">{n.title}</b>
            <span className="text-xs text-slate-500">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
          </div>
          {n.body && <p className="text-sm text-slate-500 mt-1">{n.body}</p>}
        </Card>
      ))}
    </div>
  );
}
