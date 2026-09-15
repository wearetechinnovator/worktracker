import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (user) {
    const userRole = Number(user.user_role);

    if (userRole === 1) {
      redirect("/admin/dashboard");
    }

    if (userRole === 2) {
      redirect("/user/dashboard");
    }

    redirect("/login");
  }

  return <>{children}</>;
}