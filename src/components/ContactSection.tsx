"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Send, Linkedin, Github } from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedSection } from "@/components/AnimatedSection";
import SectionWrapper from "@/components/SectionWrapper";
import { FormField } from "@/components/ui/form-field";
import { useContactForm } from "@/hooks/useContactForm";
import {
  PORTFOLIO_CONTENT,
  PRIMARY_CONTACT_CHANNELS,
  PRIMARY_SOCIAL_LINKS,
} from "@/constants/data";

const CONTACT_ICON_MAP = {
  Email: Mail,
  Phone,
  Location: MapPin,
} as const;

const SOCIAL_ICON_MAP = {
  LinkedIn: Linkedin,
  GitHub: Github,
} as const;

const SOCIAL_COLOR_MAP = {
  LinkedIn:
    "text-blue-600 hover:text-blue-700 dark:text-blue-600 dark:hover:text-blue-700",
  GitHub:
    "text-blue-600 hover:text-blue-700 dark:text-blue-600 dark:hover:text-blue-700",
} as const;

const contactInfo = PRIMARY_CONTACT_CHANNELS.map((item) => ({
  ...item,
  icon: CONTACT_ICON_MAP[item.label as keyof typeof CONTACT_ICON_MAP],
}));

const socialLinks = PRIMARY_SOCIAL_LINKS.map((item) => ({
  ...item,
  icon: SOCIAL_ICON_MAP[item.label as keyof typeof SOCIAL_ICON_MAP],
  color: SOCIAL_COLOR_MAP[item.label as keyof typeof SOCIAL_COLOR_MAP],
}));

export default function ContactSection() {
  const {
    formRef,
    sending,
    errors,
    clearError,
    handleSubmit,
    replyTo,
    messageMax,
  } = useContactForm();

  return (
    <SectionWrapper
      id="contact"
      eyebrow="Let&apos;s Talk"
      title="Get in Touch"
      description={PORTFOLIO_CONTENT.engagement.availabilityMessage}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <AnimatedSection direction="left">
          <Card className="bg-gradient-card border-0 shadow-elegant h-full">
            <CardContent className="p-8">
              <h3 className="text-2xl font-semibold mb-6 text-foreground">
                Direct Contact
              </h3>

              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <motion.a
                    key={info.label}
                    href={info.href}
                    target={
                      info.href.startsWith("http") ? "_blank" : undefined
                    }
                    rel={
                      info.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center gap-4 p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-all duration-300 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                      <info.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {info.label}
                      </p>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors duration-300">
                        {info.value}
                      </p>
                    </div>
                  </motion.a>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <h4 className="text-lg font-semibold mb-4 text-foreground">
                  Follow Me
                </h4>
                <div className="flex gap-4">
                  {socialLinks.map((social, index) => (
                    <motion.a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, scale: 0.5 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-12 h-12 rounded-full bg-background/50 hover:bg-background/80 flex items-center justify-center transition-all duration-300 group"
                    >
                      <social.icon
                        className={`w-6 h-6 transition-colors duration-300 ${social.color}`}
                      />
                    </motion.a>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        <AnimatedSection direction="right">
          <Card className="bg-gradient-card border-0 shadow-elegant h-full">
            <CardContent className="p-8">
              <h3 className="text-2xl font-semibold mb-6 text-foreground">
                Send Message
              </h3>

              <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="space-y-5"
                noValidate
              >
                <input type="hidden" name="reply_to" value={replyTo} />
                <input type="hidden" name="date" defaultValue="" />

                <FormField label="Your Name" htmlFor="contact-name" error={errors.from_name} required>
                  <Input
                    id="contact-name"
                    name="from_name"
                    type="text"
                    required
                    placeholder="Full name"
                    aria-invalid={!!errors.from_name}
                    onChange={() => clearError("from_name")}
                  />
                </FormField>

                <FormField label="Your Email" htmlFor="contact-email" error={errors.user_email} required>
                  <Input
                    id="contact-email"
                    name="user_email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    aria-invalid={!!errors.user_email}
                    onChange={() => clearError("user_email")}
                  />
                </FormField>

                <FormField label="Message" htmlFor="contact-message" error={errors.message} required>
                  <Textarea
                    id="contact-message"
                    name="message"
                    rows={5}
                    required
                    maxLength={messageMax}
                    showCount
                    placeholder="Your message here…"
                    className="resize-none"
                    aria-invalid={!!errors.message}
                    onChange={() => clearError("message")}
                  />
                </FormField>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="submit"
                    variant="default"
                    size="lg"
                    className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                    disabled={sending}
                  >
                    <Send className="w-5 h-5 mr-2" />
                    {sending ? "Sending…" : "Send Message"}
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </SectionWrapper>
  );
}
