"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ErrorCardProps {
  readonly title: string;
  readonly description: string;
  readonly backHref: string;
  readonly backLabel: string;
  readonly digest?: string;
  readonly onRetry: () => void;
}

export default function ErrorCard({
  title,
  description,
  backHref,
  backLabel,
  digest,
  onRetry,
}: ErrorCardProps) {
  return (
    <div className="relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-destructive/5 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
      </div>
      <Card className="relative mx-auto max-w-lg border-0 bg-gradient-card p-8 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {description}
        </p>
        {digest && (
          <p className="mt-2 font-mono text-xs text-muted-foreground/60">
            Error reference: {digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          <Button variant="secondary" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
