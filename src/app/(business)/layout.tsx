import { Navbar } from "@/components/shared/Navbar";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { FloatingAssistant } from "@/components/shared/FloatingAssistant";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="grid md:grid-cols-[220px_1fr]" style={{ minHeight: "calc(100vh - 65px)" }}>
        <BusinessSidebar />
        <div className="p-6 md:p-8 overflow-x-hidden">{children}</div>
      </div>
      <FloatingAssistant role="business" />
    </div>
  );
}
