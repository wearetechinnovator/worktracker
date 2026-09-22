import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import { PunchProvider } from "@/context/PunchContext";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PunchProvider>
      <div className="app-layout">
        <Sidebar />

        <div className="main-wrapper">
          <TopNavbar />

          <main className="main-content">
            {children}
          </main>
        </div>
      </div>
    </PunchProvider>
  );
}