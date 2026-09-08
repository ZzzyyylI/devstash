import { cloneElement, isValidElement } from "react";

/** Label + control + inline error, the field layout shared by the auth / profile forms. */
export function AuthField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  const errorId = `${id}-error`;
  // Point the control at its error message for screen readers when one is shown.
  const control =
    error && isValidElement<{ "aria-describedby"?: string }>(children)
      ? cloneElement(children, { "aria-describedby": errorId })
      : children;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
