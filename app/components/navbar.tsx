import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
        <Link
          href="/"
          className="font-mono text-sm font-medium tracking-tight text-foreground"
        >
          dev<span className="text-accent">/</span>ยุคai
        </Link>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link href="/members" className="nav-link">
            สมาชิก
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="nav-link">
                แดชบอร์ด
              </Link>
              <Link href="/profile" className="nav-link">
                โปรไฟล์
              </Link>
              <form action={logout}>
                <button type="submit" className="nav-link">
                  ออกจากระบบ
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-link">
                เข้าสู่ระบบ
              </Link>
              <Link href="/register" className="btn-primary px-4 py-1.5 text-xs">
                สมัครสมาชิก
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
