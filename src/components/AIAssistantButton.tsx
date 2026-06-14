"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Bot } from "lucide-react";
import { FIRST_NAME } from "@/constants/data";

const AIAssistant = dynamic(() => import("./AIAssistant"), {
  ssr: false,
  loading: () => null,
});

export default function AIAssistantButton() {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  return (
    <div className="fixed bottom-0 right-0 p-4 md:p-6 z-[99999] pointer-events-none">
      <div className="pointer-events-auto">
        {/* Floating Action Button with Animations */}
        <AnimatePresence mode="wait">
          {!isOpen && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <button
                onClick={handleClick}
                className="relative h-14 w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 rounded-full bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 flex items-center justify-center cursor-pointer group"
              >
                {/* Animated glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 opacity-50 blur-xl pointer-events-none"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

                {/* Icon */}
                <div className="relative z-10 pointer-events-none">
                  <Bot className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 text-white" />
                </div>

                {/* Tooltip */}
                <div className="absolute right-full mr-4 px-4 py-2.5 bg-background/95 backdrop-blur-sm border border-primary/20 rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <p className="text-sm font-semibold">
                    Chat with AI Assistant
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ask me anything about {FIRST_NAME}!
                  </p>
                </div>
              </button>

              {/* Pulse rings */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-purple-500 pointer-events-none"
                animate={{
                  scale: [1, 1.8],
                  opacity: [0.6, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-blue-500 pointer-events-none"
                animate={{
                  scale: [1, 1.8],
                  opacity: [0.6, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 1,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Assistant Modal */}
      <div className="pointer-events-auto">
        {isOpen ? (
          <AIAssistant isOpen={isOpen} onClose={() => setIsOpen(false)} />
        ) : null}
      </div>
    </div>
  );
}
