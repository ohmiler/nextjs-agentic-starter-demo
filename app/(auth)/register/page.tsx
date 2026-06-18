import Link from "next/link";
import { redirect } from "next/navigation";
import { register } from "@/app/actions/auth";
import { AuthForm } from "@/app/components/auth-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <AuthForm
      title="สมัครสมาชิก"
      action={register}
      fields={[
        { name: "fullName", label: "ชื่อ-นามสกุล" },
        { name: "email", label: "อีเมล", type: "email" },
        {
          name: "password",
          label: "รหัสผ่าน",
          type: "password",
          hint: "อย่างน้อย 8 ตัวอักษร",
        },
      ]}
      submitLabel="สมัครสมาชิก"
      footer={
        <>
          มีบัญชีแล้ว?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline">
            เข้าสู่ระบบ
          </Link>
        </>
      }
    />
  );
}
