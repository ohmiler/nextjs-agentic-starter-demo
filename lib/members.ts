import { asc, count } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function getMemberCount(): Promise<number> {
  const rows = await getDb().select({ value: count() }).from(users);
  return rows[0]?.value ?? 0;
}

export async function getMembers() {
  return getDb()
    .select({
      fullName: users.fullName,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.createdAt));
}
