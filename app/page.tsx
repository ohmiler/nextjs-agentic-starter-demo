import Link from "next/link";
import { getMemberCount } from "@/lib/members";

export default async function Home() {
  const memberCount = await getMemberCount();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight">ชมรม dev ยุค ai</h1>
      <p className="mt-4 text-lg text-zinc-600">
        ชุมชนนักพัฒนาที่เติบโตไปกับ AI
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/register"
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700"
        >
          สมัครสมาชิก
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium hover:bg-zinc-100"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
      <p className="mt-10 text-sm text-zinc-500">
        สมาชิกทั้งหมด {memberCount} คน ·{" "}
        <Link href="/members" className="underline hover:text-zinc-900">
          ดูรายชื่อสมาชิก
        </Link>
      </p>
    </div>
  );
}
