import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-wrapper">
        <TopNavbar />

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}