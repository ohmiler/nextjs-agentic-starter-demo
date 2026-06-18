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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        readOnly={readOnly}
        className={`input-field ${error ? "input-field--error" : ""} ${
          readOnly ? "bg-surface-raised" : ""
        }`}
      />
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
