export function FormField({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
  errors,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  errors?: string[];
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={errors && errors.length > 0 ? true : undefined}
        className="rounded-md border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
      />
      {errors?.map((error) => (
        <p key={error} className="text-xs text-red-600">
          {error}
        </p>
      ))}
    </div>
  );
}
