import { NextResponse } from "next/server";

export async function GET() {
  const envCheck = {
    GROQ_API_KEY: process.env.GROQ_API_KEY ? "✅ Set" : "❌ Missing",
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ? "✅ Set" : "❌ Missing",
    ELEVENLABS_AGENT_ID: process.env.ELEVENLABS_AGENT_ID ? "✅ Set" : "❌ Missing",
    NEXT_PUBLIC_EMAILJS_SERVICE_ID: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ? "✅ Set" : "❌ Missing",
    NEXT_PUBLIC_EMAILJS_TEMPLATE_ID: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ? "✅ Set" : "❌ Missing",
    NEXT_PUBLIC_EMAILJS_PUBLIC_KEY: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ? "✅ Set" : "❌ Missing",
    
    // Show first/last 4 characters to verify correct keys (without exposing full keys)
    GROQ_KEY_PREVIEW: process.env.GROQ_API_KEY 
      ? `${process.env.GROQ_API_KEY.substring(0, 4)}...${process.env.GROQ_API_KEY.substring(process.env.GROQ_API_KEY.length - 4)}`
      : "N/A",
    ELEVENLABS_KEY_PREVIEW: process.env.ELEVENLABS_API_KEY
      ? `${process.env.ELEVENLABS_API_KEY.substring(0, 4)}...${process.env.ELEVENLABS_API_KEY.substring(process.env.ELEVENLABS_API_KEY.length - 4)}`
      : "N/A",
    AGENT_ID_PREVIEW: process.env.ELEVENLABS_AGENT_ID
      ? `${process.env.ELEVENLABS_AGENT_ID.substring(0, 6)}...${process.env.ELEVENLABS_AGENT_ID.substring(process.env.ELEVENLABS_AGENT_ID.length - 6)}`
      : "N/A",
  };

  return NextResponse.json({
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    variables: envCheck,
  });
}
