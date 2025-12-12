import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { voice_id, text } = await req.json();
    if (!voice_id) {
      return NextResponse.json({ error: 'voice_id required' }, { status: 400 });
    }

    const elevenApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenApiKey) {
      return NextResponse.json({ error: 'Missing ELEVENLABS_API_KEY' }, { status: 500 });
    }

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text || 'Hi from your GiDi voice clone!',
        model_id: 'eleven_multilingual_v2',
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({ error: 'ElevenLabs TTS error', detail }, { status: 500 });
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('Voice preview error:', error);
    return NextResponse.json({ error: 'Voice preview failed' }, { status: 500 });
  }
}
