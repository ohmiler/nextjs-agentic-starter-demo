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
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="mb-8 text-2xl font-semibold">โปรไฟล์ของฉัน</h1>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-medium">ข้อมูลส่วนตัว</h2>
        <form action={profileAction} className="flex flex-col gap-4">
          {profileState.success && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
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

      <section>
        <h2 className="mb-4 text-lg font-medium">เปลี่ยนรหัสผ่าน</h2>
        <form action={passwordAction} className="flex flex-col gap-4">
          {passwordState.success && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              เปลี่ยนรหัสผ่านเรียบร้อยแล้ว
            </p>
          )}
          {passwordState.errors?._form && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
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
