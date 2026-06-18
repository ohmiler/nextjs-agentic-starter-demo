import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getMemberCount } from "@/lib/members";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const memberCount = await getMemberCount();

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-12 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
        แดชบอร์ด
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        {user?.fullName}
      </h1>
      <p className="mt-1 text-sm text-muted">{user?.email}</p>

      <div className="mt-12 border-t border-border">
        <Link href="/profile" className="row-link group">
          <div>
            <p className="font-medium">โปรไฟล์</p>
            <p className="mt-0.5 text-sm text-muted">แก้ไขชื่อและรหัสผ่าน</p>
          </div>
          <span className="row-link-arrow font-mono text-sm">→</span>
        </Link>
        <Link href="/members" className="row-link group">
          <div>
            <p className="font-medium">รายชื่อสมาชิก</p>
            <p className="mt-0.5 text-sm text-muted">
              ทั้งหมด {memberCount} คน
            </p>
          </div>
          <span className="row-link-arrow font-mono text-sm">→</span>
        </Link>
      </div>
    </div>
  );
}
