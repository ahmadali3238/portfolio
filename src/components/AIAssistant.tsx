"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Mic,
  Send,
  X,
  Volume2,
  VolumeX,
  Loader2,
  Bot,
  User,
  PhoneOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import FormattedMessage from "@/components/FormattedMessage";
import { FIRST_NAME } from "@/constants/data";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        `Hi! I'm ${FIRST_NAME}'s AI assistant. I can tell you about his skills, experience, and services. You can chat with me or use voice mode. How can I help you today?`,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleSendMessageRef = useRef<
    ((messageText?: string) => Promise<void>) | null
  >(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputMessage(transcript);
          setIsListening(false);
          // Auto-send in voice mode
          if (isVoiceMode) {
            handleSendMessageRef.current?.(transcript);
          }
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        window.speechSynthesis.cancel();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, [isVoiceMode]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const startListening = () => {
    if (!recognitionRef.current) {
      alert(
        "Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari."
      );
      return;
    }

    if (!isListening) {
      try {
        setIsListening(true);
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        setIsListening(false);
        alert(
          "Could not start speech recognition. Please check microphone permissions."
        );
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speakText = async (text: string) => {
    if (isMuted) return;

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    // Try ElevenLabs TTS first for more natural voice
    try {
      const response = await fetch("/api/elevenlabs-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (data.audio && !data.fallback) {
        // Play ElevenLabs audio
        const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`);
        audioRef.current = audio;
        setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          audioRef.current = null;
        };
        audio.onerror = () => {
          console.log("Audio playback error, falling back to Web Speech");
          setIsSpeaking(false);
          audioRef.current = null;
          fallbackToWebSpeech(text);
        };
        await audio.play();
        return;
      }
    } catch (error) {
      console.log("ElevenLabs failed, falling back to Web Speech API");
    }

    // Fallback to Web Speech API
    fallbackToWebSpeech(text);
  };

  const fallbackToWebSpeech = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to use a better voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.name.includes("Google") ||
        v.name.includes("Microsoft") ||
        v.name.includes("Natural")
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    // Stop Web Speech API
    window.speechSynthesis.cancel();

    // Stop any HTML5 audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    setIsSpeaking(false);
  };

  // Stream text effect
  const streamText = async (text: string) => {
    setIsStreaming(true);
    setStreamingMessage("");

    const words = text.split(" ");
    for (let i = 0; i < words.length; i++) {
      // Check if we should stop streaming
      if (!isStreaming && streamingTimeoutRef.current === null) break;

      setStreamingMessage((prev) => prev + (i > 0 ? " " : "") + words[i]);
      await new Promise((resolve) => {
        streamingTimeoutRef.current = setTimeout(resolve, 30); // Faster streaming (was 50ms)
      });
    }

    setIsStreaming(false);
    streamingTimeoutRef.current = null;
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputMessage.trim();
    if (!text || isLoading) return;

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Try ElevenLabs Conversational AI first
      const elevenlabsResponse = await fetch("/api/elevenlabs-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortControllerRef.current.signal,
      });

      const elevenlabsData = await elevenlabsResponse.json();

      let responseMessage = "";
      let audioUrl = null;

      // If ElevenLabs fails, fallback to Groq
      if (elevenlabsData.fallback) {
        console.log("ElevenLabs not available, using Groq fallback");
        const groqResponse = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            conversationHistory: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: abortControllerRef.current.signal,
        });

        const groqData = await groqResponse.json();

        if (!groqResponse.ok) {
          throw new Error(groqData.error || "Failed to get response");
        }

        responseMessage = groqData.message;
      } else {
        responseMessage = elevenlabsData.message;
        audioUrl = elevenlabsData.audioUrl;
      }

      // Stream the response
      await streamText(responseMessage);

      // Add assistant message
      const assistantMessage: Message = {
        role: "assistant",
        content: responseMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingMessage("");

      // Speak response in voice mode (use ElevenLabs audio if available)
      if (isVoiceMode && !isMuted) {
        if (audioUrl) {
          // Play ElevenLabs audio directly
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          setIsSpeaking(true);
          audio.onended = () => {
            setIsSpeaking(false);
            audioRef.current = null;
          };
          audio.onerror = () => {
            console.log("Audio playback error, falling back to TTS");
            setIsSpeaking(false);
            audioRef.current = null;
            speakText(responseMessage);
          };
          await audio.play();
        } else {
          // Use TTS endpoint
          await speakText(responseMessage);
        }
      }
    } catch (error: any) {
      // Don't show error if request was aborted
      if (error.name === "AbortError") {
        console.log("Request aborted");
        return;
      }
      const errorMessage: Message = {
        role: "assistant",
        content:
          `I apologize, but I encountered an error. Please try again or use the contact form to reach ${FIRST_NAME} directly.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  handleSendMessageRef.current = handleSendMessage;

  const endCall = () => {
    // Abort any ongoing API requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Stop all voice activities
    stopListening();
    stopSpeaking();

    // Clear streaming timeout
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
      streamingTimeoutRef.current = null;
    }

    // Reset all states
    setIsLoading(false);
    setInputMessage("");
    setStreamingMessage("");
    setIsStreaming(false);
    setIsSpeaking(false);
    setIsListening(false);
  };

  const toggleVoiceMode = () => {
    const newMode = !isVoiceMode;
    setIsVoiceMode(newMode);

    if (!newMode) {
      endCall();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[9999] w-[calc(100vw-2rem)] md:w-[360px] max-w-[360px]"
      >
        <Card
          className="bg-background/95 backdrop-blur-xl border-2 border-primary/20 shadow-2xl overflow-hidden flex flex-col"
          style={{ height: "480px" }}
        >
          {/* Header */}
          <div className="bg-gradient-primary p-3 flex flex-col gap-2 flex-shrink-0">
            {/* Title Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  {(isSpeaking || isListening) && (
                    <motion.div
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">
                    AI Assistant
                  </h3>
                  <p className="text-xs text-white/80">
                    {isVoiceMode
                      ? isListening
                        ? "Listening..."
                        : isSpeaking
                        ? "Speaking..."
                        : "Voice Call Active"
                      : "Chat Mode"}
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 h-8 w-8"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => isVoiceMode && toggleVoiceMode()}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${
                  !isVoiceMode
                    ? "bg-white text-primary font-medium shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs font-medium">Chat</span>
              </button>
              <button
                onClick={() => !isVoiceMode && toggleVoiceMode()}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${
                  isVoiceMode
                    ? "bg-white text-primary font-medium shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <Mic className="w-4 h-4" />
                <span className="text-xs font-medium">Voice</span>
              </button>
            </div>
          </div>

          {/* Voice Mode - Realistic Call Interface */}
          {isVoiceMode ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-background/50 to-background">
              {/* Centered Content */}
              <div className="flex flex-col items-center justify-center flex-1">
                {/* Status Text */}
                <motion.p
                  key={
                    isListening
                      ? "listening"
                      : isSpeaking
                      ? "speaking"
                      : isLoading
                      ? "processing"
                      : "ready"
                  }
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-6"
                >
                  {isListening
                    ? "Listening..."
                    : isSpeaking
                    ? "AI Speaking..."
                    : isLoading
                    ? "Processing..."
                    : "Ready to talk"}
                </motion.p>

                {/* Avatar with Pulse Animation */}
                <motion.div
                  className="relative cursor-pointer"
                  animate={{
                    scale: isSpeaking || isListening ? [1, 1.05, 1] : 1,
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  onClick={() => {
                    if (!isListening && !isSpeaking && !isLoading) {
                      startListening();
                    }
                  }}
                >
                  {/* Main Avatar */}
                  <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all ${
                      isListening
                        ? "bg-gradient-to-br from-red-500 to-red-600"
                        : isSpeaking
                        ? "bg-gradient-primary"
                        : isLoading
                        ? "bg-gradient-to-br from-yellow-500 to-orange-500"
                        : "bg-gradient-to-br from-gray-400 to-gray-500 hover:from-gray-300 hover:to-gray-400"
                    }`}
                  >
                    <Bot className="w-12 h-12 text-white" />
                  </div>

                  {/* Animated Ring */}
                  {(isSpeaking || isListening) && (
                    <>
                      <motion.div
                        className={`absolute inset-0 rounded-full border-4 ${
                          isListening
                            ? "border-red-500/40"
                            : "border-primary/40"
                        }`}
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.8, 0, 0.8],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <motion.div
                        className={`absolute inset-0 rounded-full border-4 ${
                          isListening
                            ? "border-red-500/30"
                            : "border-primary/30"
                        }`}
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.6, 0, 0.6],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: 0.3,
                        }}
                      />
                    </>
                  )}
                </motion.div>

                {/* Waveform Visualization */}
                <div className="h-16 flex items-center justify-center mt-6">
                  {isListening && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-1.5"
                    >
                      {[...Array(9)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 rounded-full bg-red-500"
                          animate={{
                            height: ["10px", "40px", "10px"],
                          }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.1,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </motion.div>
                  )}

                  {isSpeaking && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-1.5"
                    >
                      {[...Array(11)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 rounded-full bg-primary"
                          animate={{
                            height: ["12px", "48px", "12px"],
                          }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.08,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </motion.div>
                  )}

                  {isLoading && !isListening && !isSpeaking && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-1.5"
                    >
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-primary"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.3, 1, 0.3],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Mode - Messages */}
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-2.5">
                <div className="space-y-2.5">
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex gap-2 ${
                        message.role === "user"
                          ? "flex-row-reverse"
                          : "flex-row"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.role === "user"
                            ? "bg-gradient-hero"
                            : "bg-gradient-primary"
                        }`}
                      >
                        {message.role === "user" ? (
                          <User className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Bot className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                      <div
                        className={`flex-1 ${
                          message.role === "user" ? "text-right" : "text-left"
                        }`}
                      >
                        <div
                          className={`inline-block p-2.5 rounded-2xl max-w-[85%] text-sm ${
                            message.role === "user"
                              ? "bg-gradient-hero text-white rounded-tr-none"
                              : "bg-muted text-foreground rounded-tl-none"
                          }`}
                        >
                          <FormattedMessage
                            content={message.content}
                            isUser={message.role === "user"}
                          />
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-0.5 px-1.5">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </motion.div>
                  ))}

                  {/* Streaming message */}
                  {isStreaming && streamingMessage && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-2"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="inline-block p-2.5 rounded-2xl rounded-tl-none bg-muted text-foreground max-w-[85%]">
                          <div className="text-sm leading-relaxed">
                            <FormattedMessage
                              content={streamingMessage}
                              isUser={false}
                            />
                            <motion.span
                              animate={{ opacity: [1, 0] }}
                              transition={{ repeat: Infinity, duration: 0.8 }}
                              className="inline-block w-1 h-4 bg-primary ml-1 align-middle"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {isLoading && !isStreaming && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-2"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="bg-muted p-2.5 rounded-2xl rounded-tl-none">
                        <div className="flex gap-1.5">
                          <motion.div
                            className="w-1.5 h-1.5 rounded-full bg-primary"
                            animate={{
                              scale: [1, 1.5, 1],
                              opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 1,
                              delay: 0,
                            }}
                          />
                          <motion.div
                            className="w-1.5 h-1.5 rounded-full bg-primary"
                            animate={{
                              scale: [1, 1.5, 1],
                              opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 1,
                              delay: 0.2,
                            }}
                          />
                          <motion.div
                            className="w-1.5 h-1.5 rounded-full bg-primary"
                            animate={{
                              scale: [1, 1.5, 1],
                              opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 1,
                              delay: 0.4,
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Input */}
          <div className="p-2.5 border-t border-border bg-background/50 flex-shrink-0">
            <div className="flex gap-2 items-center">
              {isVoiceMode ? (
                <>
                  <Button
                    onClick={isListening ? stopListening : startListening}
                    className={`flex-1 h-12 ${
                      isListening
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-gradient-primary"
                    }`}
                  >
                    {isListening ? (
                      <div className="flex items-center gap-3">
                        {/* Waveform animation */}
                        <div className="flex items-center gap-1 h-6">
                          {[...Array(5)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="w-1 bg-white rounded-full"
                              animate={{
                                height: ["8px", "24px", "8px"],
                              }}
                              transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                delay: i * 0.1,
                                ease: "easeInOut",
                              }}
                            />
                          ))}
                        </div>
                        <span className="font-medium">Listening...</span>
                      </div>
                    ) : (
                      <>
                        <Mic className="w-5 h-5 mr-2" />
                        <span className="font-medium">Tap to Speak</span>
                      </>
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setIsMuted(!isMuted)}
                    className="h-12 w-12"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={endCall}
                    className="h-12 w-12 bg-red-500 hover:bg-red-600"
                    title="End Call"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && !e.shiftKey && handleSendMessage()
                    }
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="flex-1 h-12 text-sm"
                  />
                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || isLoading}
                    size="icon"
                    className="bg-gradient-primary h-12 w-12"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </>
              )}
            </div>

            {/* Voice mode indicator when speaking */}
            {isVoiceMode && isSpeaking && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground"
              >
                <div className="flex items-center gap-1">
                  {[...Array(7)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary rounded-full"
                      animate={{
                        height: ["4px", "16px", "4px"],
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.08,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
                <span>AI speaking...</span>
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
