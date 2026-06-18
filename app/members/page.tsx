import { getMemberCount, getMembers } from "@/lib/members";

export default async function MembersPage() {
  const [members, count] = await Promise.all([getMembers(), getMemberCount()]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold">สมาชิกชมรม dev ยุค ai</h1>
      <p className="mt-1 text-sm text-zinc-500">ทั้งหมด {count} คน</p>
      <ol className="mt-8 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
        {members.length === 0 ? (
          <li className="px-4 py-6 text-center text-zinc-500">
            ยังไม่มีสมาชิก
          </li>
        ) : (
          members.map((member, index) => (
            <li key={`${member.fullName}-${member.createdAt}`} className="px-4 py-3">
              {index + 1}. {member.fullName}
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
