import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
  readonly label: string;
  readonly htmlFor: string;
  readonly error?: string;
  readonly hint?: string;
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly required?: boolean;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
  required,
}: FormFieldProps) {
  const descId = `${htmlFor}-desc`;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error ? (
        <p id={descId} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={descId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
