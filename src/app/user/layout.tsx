import { redirect } from "next/navigation";

import { currentUser } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();


  // Not logged in
  if (!user) {
    redirect("/login");
  }

  const userRole = Number(user.user_role);

  // Admin cannot access /user/*
  if (userRole === 1) {
    redirect("/admin/dashboard");
  }

  // Only employee can access /user/*
  if (userRole !== 2) {
    redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}