import { NextRequest, NextResponse } from "next/server";

// Google Cloud TTS has been removed - always fallback to browser TTS
export async function POST(request: NextRequest) {
  try {
    const {
      text,
      voiceName = "en-US-Neural2-F",
      speakingRate = 1.0,
    } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Always return fallback to use Web Speech API on client side
    return NextResponse.json(
      {
        error: "Google Cloud TTS not configured",
        fallback: true,
        message: "Using browser speech synthesis instead",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("TTS API Error:", error);

    // Return fallback flag so client can use Web Speech API
    return NextResponse.json(
      {
        error: "TTS service unavailable",
        fallback: true,
        message: error.message || "Using browser speech synthesis instead",
      },
      { status: 200 }
    );
  }
}

// Voice options endpoint
export async function GET() {
  const voices = [
    {
      name: "en-US-Neural2-C",
      gender: "Female",
      description: "Professional, warm",
    },
    {
      name: "en-US-Neural2-D",
      gender: "Male",
      description: "Confident, clear",
    },
    {
      name: "en-US-Neural2-F",
      gender: "Female",
      description: "Friendly, conversational",
    },
    {
      name: "en-US-Neural2-A",
      gender: "Male",
      description: "Professional, calm",
    },
    {
      name: "en-GB-Neural2-A",
      gender: "Male",
      description: "British, sophisticated",
    },
    {
      name: "en-GB-Neural2-F",
      gender: "Female",
      description: "British, elegant",
    },
  ];

  return NextResponse.json({
    voices,
    provider: "Google Cloud TTS Neural2",
    fallbackAvailable: true,
  });
}
