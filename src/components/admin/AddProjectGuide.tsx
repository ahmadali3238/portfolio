"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, FileCode2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PROJECT_GENERATION_PROMPT } from "@/constants/projectGenerationPrompt";

const PROJECTS_FILE = "src/constants/projects-data.ts";

const STEPS: { title: string; detail: string }[] = [
  {
    title: "Open Claude inside this repo",
    detail:
      "Use Claude Code (or Claude with repo access) in the portfolio project so it can read the target project's real source.",
  },
  {
    title: "Copy the prompt and paste it into Claude",
    detail:
      "Use the Copy button below, then replace <PASTE PATH HERE> with the project's source folder path (it can be any local repo).",
  },
  {
    title: "Answer the one or two metadata questions",
    detail:
      "Claude will ask for the duration, whether GitHub/demo links are public or private, and whether to feature it on the résumé.",
  },
  {
    title: `Paste the returned ProjectEntry into ${PROJECTS_FILE}`,
    detail:
      "Add the object to the PROJECT_ENTRIES array near the other featured projects. That single file is the source of truth — the card, detail page, résumé, and AI assistant all update from it.",
  },
  {
    title: "Add the card image to /public",
    detail:
      "Save the generated image as public/<slug>.webp so the entry's image path resolves.",
  },
  {
    title: "Preview, then commit",
    detail:
      "Run the site, confirm the new project card and /projects/<slug> page look right, then commit and push.",
  },
];

export default function AddProjectGuide({ adminEmail }: { readonly adminEmail: string }) {
  const [copied, setCopied] = useState(false);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(PROJECT_GENERATION_PROMPT);
      setCopied(true);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy automatically — select the text and copy manually.");
    }
  };

  return (
    <div className="space-y-8">
      <Card className="relative overflow-hidden border-0 bg-gradient-card p-6 shadow-card">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-primary-glow/5 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-primary">
              Protected Admin
            </p>
            <h1 className="mt-2 bg-gradient-hero bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              Add a Project
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              Signed in as {adminEmail}. Generate a code-grounded project entry
              with Claude, then drop it into{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {PROJECTS_FILE}
              </code>
              .
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/admin/blog">
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>
          </Button>
        </div>
      </Card>

      <Card className="border-0 bg-gradient-card p-6 shadow-card">
        <h2 className="text-lg font-semibold text-foreground">How it works</h2>
        <ol className="mt-4 space-y-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {index + 1}
              </span>
              <div>
                <p className="font-medium text-foreground">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="border-0 bg-gradient-card p-6 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Reusable prompt
            </h2>
          </div>
          <Button onClick={copyPrompt} variant={copied ? "secondary" : "default"}>
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy prompt
              </>
            )}
          </Button>
        </div>
        <pre className="mt-4 max-h-[28rem] overflow-auto rounded-lg border border-border bg-background/60 p-4 text-xs leading-5 text-foreground">
          <code>{PROJECT_GENERATION_PROMPT}</code>
        </pre>
      </Card>
    </div>
  );
}
