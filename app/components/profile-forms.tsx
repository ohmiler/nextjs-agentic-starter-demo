"use client";

import { useActionState } from "react";
import { updateProfile, changePassword } from "@/app/actions/profile";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";
import type { ActionState } from "@/app/actions/auth";

const initialState: ActionState = { success: false };

type ProfileFormsProps = {
  fullName: string;
  email: string;
};

export function ProfileForms({ fullName, email }: ProfileFormsProps) {
  const [profileState, profileAction] = useActionState(
    updateProfile,
    initialState,
  );
  const [passwordState, passwordAction] = useActionState(
    changePassword,
    initialState,
  );

  return (
    <div className="mx-auto w-full max-w-md px-5 py-12 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
        บัญชี
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">โปรไฟล์</h1>

      <section className="mt-12 border-t border-border pt-10">
        <h2 className="text-sm font-medium">ข้อมูลส่วนตัว</h2>
        <form action={profileAction} className="mt-5 flex flex-col gap-5">
          {profileState.success && (
            <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
              บันทึกข้อมูลเรียบร้อยแล้ว
            </p>
          )}
          <FormField
            name="fullName"
            label="ชื่อ-นามสกุล"
            defaultValue={fullName}
            error={profileState.errors?.fullName}
          />
          <FormField name="email" label="อีเมล" defaultValue={email} readOnly />
          <SubmitButton label="บันทึก" pendingLabel="กำลังบันทึก..." />
        </form>
      </section>

      <section className="mt-12 border-t border-border pt-10">
        <h2 className="text-sm font-medium">เปลี่ยนรหัสผ่าน</h2>
        <form action={passwordAction} className="mt-5 flex flex-col gap-5">
          {passwordState.success && (
            <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
              เปลี่ยนรหัสผ่านเรียบร้อยแล้ว
            </p>
          )}
          {passwordState.errors?._form && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {passwordState.errors._form}
            </p>
          )}
          <FormField
            name="currentPassword"
            label="รหัสผ่านเดิม"
            type="password"
            error={passwordState.errors?.currentPassword}
          />
          <FormField
            name="newPassword"
            label="รหัสผ่านใหม่"
            type="password"
            error={passwordState.errors?.newPassword}
          />
          <FormField
            name="confirmPassword"
            label="ยืนยันรหัสผ่าน"
            type="password"
            error={passwordState.errors?.confirmPassword}
          />
          <SubmitButton
            label="เปลี่ยนรหัสผ่าน"
            pendingLabel="กำลังเปลี่ยน..."
          />
        </form>
      </section>
    </div>
  );
}
