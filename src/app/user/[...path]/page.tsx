import { redirect } from "next/navigation";

export default function UserCatchAllPage() {
  redirect("/user/dashboard");
}
