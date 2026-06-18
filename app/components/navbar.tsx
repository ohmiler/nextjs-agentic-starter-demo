import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-zinc-900">
          ชมรม dev ยุค ai
        </Link>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/" className="text-zinc-600 hover:text-zinc-900">
            หน้าแรก
          </Link>
          <Link href="/members" className="text-zinc-600 hover:text-zinc-900">
            รายชื่อสมาชิก
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-zinc-600 hover:text-zinc-900"
              >
                แดชบอร์ด
              </Link>
              <Link
                href="/profile"
                className="text-zinc-600 hover:text-zinc-900"
              >
                โปรไฟล์
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-zinc-600 hover:text-zinc-900"
                >
                  ออกจากระบบ
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-zinc-600 hover:text-zinc-900">
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-zinc-900 px-3 py-1 text-white hover:bg-zinc-700"
              >
                สมัครสมาชิก
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
