import { getMemberCount, getMembers } from "@/lib/members";

export default async function MembersPage() {
  const [members, count] = await Promise.all([getMembers(), getMemberCount()]);

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-12 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
        สมาชิก
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        รายชื่อสมาชิก
      </h1>
      <p className="mt-1 text-sm text-muted">ทั้งหมด {count} คน</p>

      <ol className="mt-10 divide-y divide-border">
        {members.length === 0 ? (
          <li className="py-8 text-center text-sm text-muted">
            ยังไม่มีสมาชิก
          </li>
        ) : (
          members.map((member, index) => (
            <li
              key={`${member.fullName}-${member.createdAt}`}
              className="flex items-baseline gap-4 py-4"
            >
              <span className="w-8 shrink-0 font-mono text-xs text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-foreground">{member.fullName}</span>
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
