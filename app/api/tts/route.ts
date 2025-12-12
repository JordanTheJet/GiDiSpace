// app/api/tts/route.ts - ElevenLabs Text-to-Speech endpoint
import { NextRequest, NextResponse } from 'next/server';

// Default voice ID for Giulia (LILIIA's cloned voice)
const DEFAULT_VOICE_ID = 'zY2HMEGUPYdbv4Q7IE7U';

export async function POST(request: NextRequest) {
    try {
        const { text, voiceId } = await request.json();

        if (!text) {
            return NextResponse.json(
                { error: 'Text is required' },
                { status: 400 }
            );
        }

        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'ElevenLabs API key not configured' },
                { status: 500 }
            );
        }

        const selectedVoiceId = voiceId || DEFAULT_VOICE_ID;

        // Call ElevenLabs API
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey,
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        style: 0.0,
                        use_speaker_boost: true,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs API error:', response.status, errorText);
            return NextResponse.json(
                { error: `ElevenLabs API error: ${response.status}` },
                { status: response.status }
            );
        }

        // Get the audio data as ArrayBuffer
        const audioData = await response.arrayBuffer();

        // Return the audio as MP3
        return new NextResponse(audioData, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioData.byteLength.toString(),
            },
        });

    } catch (error) {
        console.error('TTS error:', error);
        return NextResponse.json(
            { error: 'Failed to generate speech' },
            { status: 500 }
        );
    }
}
