"use client";

import { motion } from "framer-motion";

interface FadeInCardProps {
  readonly children: React.ReactNode;
  readonly index?: number;
  readonly className?: string;
}

export function FadeInCard({ children, index = 0, className }: FadeInCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
