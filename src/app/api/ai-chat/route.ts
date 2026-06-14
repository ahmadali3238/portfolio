import { NextRequest, NextResponse } from "next/server";
import {
  getAssistantProvider,
  generateAssistantReply,
  type AssistantConversationMessage,
} from "@/lib/assistant";

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const assistantMessage = await generateAssistantReply(
      message,
      conversationHistory as AssistantConversationMessage[]
    );

    return NextResponse.json({
      message: assistantMessage,
      provider: getAssistantProvider(),
    });
  } catch (error: any) {
    console.error("Groq API Error:", error);

    // Handle specific error cases
    if (error?.status === 401) {
      return NextResponse.json(
        {
          error:
            "Invalid API key. Please check your GROQ_API_KEY in .env file.",
        },
        { status: 401 }
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in a moment." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get response from AI assistant" },
      { status: 500 }
    );
  }
}

// Optional: Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "online",
    model: "llama-3.3-70b-versatile",
    provider: getAssistantProvider(),
  });
}
