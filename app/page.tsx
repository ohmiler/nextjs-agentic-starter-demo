import Link from "next/link";
import { getMemberCount } from "@/lib/members";

export default async function Home() {
  const memberCount = await getMemberCount();

  return (
    <>
      <section className="hero-mesh relative flex min-h-[calc(100svh-3.5rem)] w-full flex-col justify-end overflow-hidden">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl animate-[pulse-glow_6s_ease-in-out_infinite]" />

        <div className="relative mx-auto w-full max-w-5xl px-5 pb-16 pt-24 sm:pb-24 sm:pt-32">
          <p className="animate-fade-up font-mono text-xs uppercase tracking-[0.2em] text-accent">
            ชมรม dev ยุค ai
          </p>
          <h1 className="animate-fade-up delay-1 mt-4 max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
            สร้างสิ่งต่อไป
            <br />
            <span className="text-muted">ไปกับ AI</span>
          </h1>
          <p className="animate-fade-up delay-2 mt-5 max-w-md text-base text-muted sm:text-lg">
            ชุมชนนักพัฒนาไทย — เรียนรู้ แชร์ และเติบโตในโลก agentic
          </p>
          <div className="animate-fade-up delay-3 mt-10 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary">
              สมัครสมาชิก
            </Link>
            <Link href="/login" className="btn-ghost">
              เข้าสู่ระบบ
            </Link>
          </div>
          <p className="animate-fade-up delay-4 mt-12 font-mono text-sm text-muted">
            สมาชิก {memberCount} คน ·{" "}
            <Link href="/members" className="text-foreground underline-offset-4 hover:text-accent hover:underline">
              ดูรายชื่อ
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-5xl gap-px bg-border px-5 sm:grid-cols-3">
          {[
            { label: "Agentic dev", desc: "Next.js, AI tools, workflow ใหม่" },
            { label: "Community", desc: "แชร์ประสบการณ์และโปรเจกต์จริง" },
            { label: "Open join", desc: "สมัครแล้วใช้งานได้ทันที" },
          ].map((item) => (
            <div key={item.label} className="bg-background px-0 py-10 sm:px-6">
              <p className="font-mono text-xs uppercase tracking-wider text-accent">
                {item.label}
              </p>
              <p className="mt-2 text-sm text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-5 py-16 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-medium tracking-tight">พร้อมเริ่มแล้ว?</h2>
            <p className="mt-1 text-sm text-muted">ใช้เวลาไม่ถึงนาที</p>
          </div>
          <Link href="/register" className="btn-primary shrink-0">
            สมัครสมาชิกฟรี
          </Link>
        </div>
      </section>
    </>
  );
}
