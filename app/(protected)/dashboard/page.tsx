import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold">
        ยินดีต้อนรับ, {user?.fullName} 👋
      </h1>
      <p className="mt-2 text-zinc-600">ยินดีต้อนรับสู่ชมรม dev ยุค ai</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/profile"
          className="rounded-xl border border-zinc-200 bg-white p-6 hover:border-zinc-400"
        >
          <h2 className="font-medium">โปรไฟล์ของฉัน</h2>
          <p className="mt-1 text-sm text-zinc-500">แก้ไขชื่อและรหัสผ่าน</p>
        </Link>
        <Link
          href="/members"
          className="rounded-xl border border-zinc-200 bg-white p-6 hover:border-zinc-400"
        >
          <h2 className="font-medium">สมาชิกทั้งหมด</h2>
          <p className="mt-1 text-sm text-zinc-500">ดูรายชื่อสมาชิกชมรม</p>
        </Link>
      </div>
    </div>
  );
}
