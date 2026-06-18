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
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Field[];
  submitLabel: string;
  footer: React.ReactNode;
};

const initialState: ActionState = { success: false };

export function AuthForm({
  title,
  action,
  fields,
  submitLabel,
  footer,
}: AuthFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
      <form action={formAction} className="flex flex-col gap-4">
        {state.errors?._form && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
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
      <div className="mt-4 text-center text-sm text-zinc-600">{footer}</div>
    </div>
  );
}
