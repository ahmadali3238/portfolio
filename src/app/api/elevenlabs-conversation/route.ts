import { NextRequest, NextResponse } from "next/server";
import {
  getAssistantProvider,
  generateAssistantReply,
  type AssistantConversationMessage,
} from "@/lib/assistant";

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const responseMessage = await generateAssistantReply(
      message,
      (conversationHistory || []) as AssistantConversationMessage[]
    );

    return NextResponse.json({
      message: responseMessage,
      audioUrl: null,
      fallback: false,
      provider: getAssistantProvider(),
    });
  } catch (error: any) {
    console.error("ElevenLabs Conversation Error:", error);
    return NextResponse.json({
      fallback: true,
      error: error.message || "Failed to get response",
    });
  }
}
