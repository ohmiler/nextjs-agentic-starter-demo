import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?message=" + encodeURIComponent("กรุณาเข้าสู่ระบบใหม่"));
  }
  return <>{children}</>;
}
