"use client";

import { useActionState } from "react";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";
import type { ActionState } from "@/app/actions/auth";

type Field = {
  name: string;
  label: string;
  type?: string;
  hint?: string;
};

type AuthFormProps = {
  title: string;
  subtitle?: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Field[];
  submitLabel: string;
  footer: React.ReactNode;
};

const initialState: ActionState = { success: false };

export function AuthForm({
  title,
  subtitle,
  action,
  fields,
  submitLabel,
  footer,
}: AuthFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <div className="mx-auto w-full max-w-md px-5 py-16 sm:py-20">
      <div className="animate-fade-up">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          ชมรม dev ยุค ai
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      </div>

      <form action={formAction} className="animate-fade-up delay-1 mt-8 flex flex-col gap-5">
        {state.errors?._form && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {state.errors._form}
          </p>
        )}
        {fields.map((field) => (
          <FormField
            key={field.name}
            name={field.name}
            label={field.label}
            type={field.type}
            hint={field.hint}
            error={state.errors?.[field.name]}
          />
        ))}
        <SubmitButton label={submitLabel} />
      </form>

      <div className="animate-fade-in delay-2 mt-6 text-center text-sm text-muted">
        {footer}
      </div>
    </div>
  );
}
