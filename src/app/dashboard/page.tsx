import { redirect } from "next/navigation";

import { currentUser } from "@/lib/auth";

export default async function DashboardRedirectPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/login");
  }

  if (Number(user.user_role) === 1) {
    redirect("/admin/dashboard");
  }

  if (Number(user.user_role) === 2) {
    redirect("/user/dashboard");
  }

  redirect("/login");
}
