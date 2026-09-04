import { Navbar } from "@/components/shared/Navbar";
import { CustomerSidebar } from "@/components/customer/CustomerSidebar";
import { FloatingAssistant } from "@/components/shared/FloatingAssistant";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="grid md:grid-cols-[220px_1fr] w-full" style={{ minHeight: "calc(100vh - 65px)" }}>
        <CustomerSidebar />
        <main className="p-4 sm:p-6 md:p-8 min-w-0 w-full overflow-x-hidden">{children}</main>
      </div>
      <FloatingAssistant role="customer" />
    </div>
  );
}
