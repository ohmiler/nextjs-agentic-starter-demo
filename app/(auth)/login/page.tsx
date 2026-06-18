import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { AuthForm } from "@/app/components/auth-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const params = await searchParams;

  return (
    <div>
      {params.message && (
        <p className="mx-auto mt-4 max-w-md rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {params.message}
        </p>
      )}
      <AuthForm
        title="เข้าสู่ระบบ"
        action={login}
        fields={[
          { name: "email", label: "อีเมล", type: "email" },
          { name: "password", label: "รหัสผ่าน", type: "password" },
        ]}
        submitLabel="เข้าสู่ระบบ"
        footer={
          <>
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="font-medium text-zinc-900 underline">
              สมัครสมาชิก
            </Link>
          </>
        }
      />
    </div>
  );
}
