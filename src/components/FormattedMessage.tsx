"use client";

import React from "react";
import { ExternalLink } from "lucide-react";

interface FormattedMessageProps {
  content: string;
  isUser: boolean;
}

export default function FormattedMessage({
  content,
  isUser,
}: FormattedMessageProps) {
  // Format the message content with proper styling
  const formatContent = (text: string) => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let key = 0;

    // Regular expressions for different formatting
    const patterns = {
      // Links - [text](url) or plain URLs
      link: /\[([^\]]+)\]\(([^)]+)\)|https?:\/\/[^\s<]+/g,
      // Bold - **text** or __text__
      bold: /\*\*([^*]+)\*\*|__([^_]+)__/g,
      // Italic - *text* or _text_
      italic: /\*([^*]+)\*|_([^_]+)_/g,
      // Code - `code`
      code: /`([^`]+)`/g,
      // Line breaks
      newline: /\n/g,
    };

    // Split by line first to handle lists
    const lines = text.split("\n");

    lines.forEach((line, lineIndex) => {
      // Check for lists
      const listMatch = line.match(/^[-*•]\s+(.+)$/);
      if (listMatch) {
        parts.push(
          <div key={`list-${key++}`} className="flex gap-2 my-1">
            <span className="text-primary">•</span>
            <span>{formatInlineText(listMatch[1])}</span>
          </div>
        );
      }
      // Check for numbered lists
      else if (line.match(/^\d+\.\s+(.+)$/)) {
        const numberMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (numberMatch) {
          parts.push(
            <div key={`numlist-${key++}`} className="flex gap-2 my-1">
              <span className="text-primary font-medium">
                {numberMatch[1]}.
              </span>
              <span>{formatInlineText(numberMatch[2])}</span>
            </div>
          );
        }
      }
      // Regular text
      else if (line.trim()) {
        parts.push(
          <div key={`line-${key++}`} className="my-1">
            {formatInlineText(line)}
          </div>
        );
      }
      // Empty line
      else if (lineIndex < lines.length - 1) {
        parts.push(<div key={`break-${key++}`} className="h-2" />);
      }
    });

    return parts;
  };

  // Format inline text (bold, italic, links, code)
  const formatInlineText = (text: string) => {
    const elements: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Check for links first - [text](url)
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch && linkMatch.index === 0) {
        elements.push(
          <a
            key={`link-${key++}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 underline hover:text-primary transition-colors ${
              isUser ? "text-white/90 hover:text-white" : "text-primary"
            }`}
          >
            {linkMatch[1]}
            <ExternalLink className="w-3 h-3" />
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Check for plain URLs
      const urlMatch = remaining.match(/^(https?:\/\/[^\s<]+)/);
      if (urlMatch) {
        elements.push(
          <a
            key={`url-${key++}`}
            href={urlMatch[1]}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 underline hover:text-primary transition-colors break-all ${
              isUser ? "text-white/90 hover:text-white" : "text-primary"
            }`}
          >
            {urlMatch[1]}
            <ExternalLink className="w-3 h-3" />
          </a>
        );
        remaining = remaining.slice(urlMatch[1].length);
        continue;
      }

      // Check for bold - **text**
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        elements.push(
          <strong key={`bold-${key++}`} className="font-semibold">
            {boldMatch[1]}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Check for italic - *text*
      const italicMatch = remaining.match(/^\*([^*]+)\*/);
      if (italicMatch) {
        elements.push(
          <em key={`italic-${key++}`} className="italic">
            {italicMatch[1]}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Check for code - `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        elements.push(
          <code
            key={`code-${key++}`}
            className={`px-1.5 py-0.5 rounded text-xs font-mono ${
              isUser ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
            }`}
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // No match, take one character
      elements.push(remaining[0]);
      remaining = remaining.slice(1);
    }

    return elements;
  };

  return (
    <div className="text-sm leading-relaxed">{formatContent(content)}</div>
  );
}
