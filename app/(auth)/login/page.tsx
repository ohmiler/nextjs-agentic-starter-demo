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
        <p className="mx-auto mt-6 max-w-md rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-200">
          {params.message}
        </p>
      )}
      <AuthForm
        title="เข้าสู่ระบบ"
        subtitle="ใช้อีเมลและรหัสผ่านที่สมัครไว้"
        action={login}
        fields={[
          { name: "email", label: "อีเมล", type: "email" },
          { name: "password", label: "รหัสผ่าน", type: "password" },
        ]}
        submitLabel="เข้าสู่ระบบ"
        footer={
          <>
            ยังไม่มีบัญชี?{" "}
            <Link
              href="/register"
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              สมัครสมาชิก
            </Link>
          </>
        }
      />
    </div>
  );
}
