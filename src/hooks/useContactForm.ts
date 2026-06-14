import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { PERSONAL_INFO } from "@/constants/data";

const MESSAGE_MAX = 1000;

function validate(form: HTMLFormElement): Record<string, string> {
  const errs: Record<string, string> = {};
  const name = (
    form.elements.namedItem("from_name") as HTMLInputElement
  )?.value.trim();
  const email = (
    form.elements.namedItem("user_email") as HTMLInputElement
  )?.value.trim();
  const message = (
    form.elements.namedItem("message") as HTMLTextAreaElement
  )?.value.trim();

  if (!name || name.length < 2)
    errs.from_name = "Name must be at least 2 characters.";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errs.user_email = "Enter a valid email address.";
  if (!message || message.length < 10)
    errs.message = "Message must be at least 10 characters.";
  if (message && message.length > MESSAGE_MAX)
    errs.message = `Message must be under ${MESSAGE_MAX} characters.`;

  return errs;
}

export function useContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = useCallback(
    (field: string) =>
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      }),
    [],
  );

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;

    const fieldErrors = validate(formRef.current);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    const serviceID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!;
    const templateID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!;
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!;

    if (!serviceID || !templateID || !publicKey) {
      console.error("EmailJS env vars missing");
      toast.error("Configuration error", {
        description: "Please check EmailJS keys.",
      });
      return;
    }

    const dateField = formRef.current.elements.namedItem("date");
    if (dateField instanceof HTMLInputElement) {
      dateField.value = new Date().toLocaleString();
    }

    setSending(true);
    try {
      const { sendForm } = await import("@emailjs/browser");
      await sendForm(serviceID, templateID, formRef.current, { publicKey });
      toast.success("Message sent!", {
        description: "Thanks\u2014I\u2019ll be in touch soon.",
      });
      formRef.current.reset();
      setErrors({});
    } catch (err: unknown) {
      console.error("EmailJS failed", err);
      toast.error("Send failed", { description: "Try again later." });
    } finally {
      setSending(false);
    }
  }, []);

  return {
    formRef,
    sending,
    errors,
    clearError,
    handleSubmit,
    replyTo: PERSONAL_INFO.email,
    messageMax: MESSAGE_MAX,
  } as const;
}
