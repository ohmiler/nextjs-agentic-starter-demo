type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  error?: string;
  hint?: string;
  defaultValue?: string;
  readOnly?: boolean;
};

export function FormField({
  label,
  name,
  type = "text",
  error,
  hint,
  defaultValue,
  readOnly,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-zinc-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        readOnly={readOnly}
        className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 ${
          readOnly ? "bg-zinc-100 text-zinc-500" : "bg-white"
        } ${error ? "border-red-500" : "border-zinc-300"}`}
      />
      {hint && !error && (
        <p className="text-xs text-zinc-500">{hint}</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
