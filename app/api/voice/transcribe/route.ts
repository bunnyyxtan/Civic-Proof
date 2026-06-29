// app/api/voice/transcribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/src/lib/ai/geminiClient";
import { shouldUseGemini } from "@/src/lib/ai/modelConfig";
import { Type } from "@google/genai";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioDataUrl, mimeType, voiceMode } = body;

    if (!audioDataUrl) {
      return NextResponse.json({
        ok: false,
        error: {
          code: "TRANSCRIPTION_ERROR",
          message: "No audio data provided."
        }
      }, { status: 400 });
    }

    // Check if Gemini is enabled and available
    if (!shouldUseGemini()) {
      return NextResponse.json({
        ok: false,
        error: {
          code: "TRANSCRIPTION_ERROR",
          message: "Voice transcription is unavailable right now. Type your note manually and continue."
        }
      }, { status: 503 });
    }

    // Extract base64 data
    const parts = audioDataUrl.split(",");
    const base64Data = parts[1] || parts[0];

    // Clean mimeType: some browsers might record as audio/webm;codecs=opus
    // Keep it as standard as possible or pass it directly
    const finalMimeType = mimeType || "audio/webm";

    // Lazy initialize Gemini client
    const ai = getGeminiClient();

    // Prepare system instructions based on rules
    const systemInstruction = `You are an expert high-fidelity speech-to-text transcriber specializing in civic safety issues and local Indian contexts.
Your ONLY task is to transcribe the spoken words in the provided audio file.
Do NOT analyze the issue. Do NOT summarize. Do NOT generate a complaint or add any text not spoken in the audio.
Do NOT hallucinate or invent civic complaint text.

Dialect/Language Guidelines:
- If the selected voiceMode is 'hi-IN': Transcribe primarily Hindi speech. Preserve local place names. Use Devanagari when the user speaks Hindi unless the phrase is commonly written in English.
- If the selected voiceMode is 'en-IN': Transcribe Indian English. Preserve place names and civic terms.
- If the selected voiceMode is 'mixed-IN': Transcribe natural Hinglish/code-mixed speech. Preserve the user’s language choices. Do not translate everything into English unless the user spoke English.

Silence/Noise rule:
If the audio contains only silence, background noise, breathing, static, or no clear human speech, you must return an empty transcript "" and set emptySpeechDetected to true.`;

    const userPrompt = `Voice Mode: ${voiceMode}. Transcribe the attached audio file.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: finalMimeType,
            data: base64Data
          }
        },
        {
          text: userPrompt
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: {
              type: Type.STRING,
              description: "The transcription of the spoken words in the audio. Empty string if no human speech is detected.",
            },
            emptySpeechDetected: {
              type: Type.BOOLEAN,
              description: "True if the audio is silent, background noise, or no clear spoken words are present.",
            }
          },
          required: ["transcript", "emptySpeechDetected"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini.");
    }

    const parsed = JSON.parse(responseText.trim());
    const transcript = (parsed.transcript || "").trim();
    const emptySpeechDetected = !!parsed.emptySpeechDetected || transcript === "";

    if (emptySpeechDetected) {
      return NextResponse.json({
        ok: true,
        data: {
          transcript: "",
          voiceMode: voiceMode,
          provider: "none",
          emptySpeechDetected: true,
          message: "No clear speech detected. Try again or type manually."
        }
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        transcript: transcript,
        voiceMode: voiceMode,
        provider: "gemini",
        emptySpeechDetected: false
      }
    });

  } catch (error: any) {
    console.error("Transcription endpoint error:", error);
    return NextResponse.json({
      ok: false,
      error: {
        code: "TRANSCRIPTION_ERROR",
        message: "Could not transcribe the voice note. Please type the note manually or try again."
      }
    }, { status: 500 });
  }
}
