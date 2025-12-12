import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const name = (formData.get('name') as string) || 'GiDi Voice';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 });
    }

    const elevenApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenApiKey) {
      return NextResponse.json({ error: 'Missing ELEVENLABS_API_KEY' }, { status: 500 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const body = new FormData();
    body.append('name', name);
    body.append('files', new Blob([buffer], { type: 'audio/webm' }), 'voice.webm');

    const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenApiKey,
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: 'ElevenLabs error', detail: text }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({
      voice_id: data?.voice_id || data?.voiceId || null,
      message: 'Voice cloned successfully',
    });
  } catch (error) {
    console.error('Voice clone error:', error);
    return NextResponse.json({ error: 'Voice clone failed' }, { status: 500 });
  }
}
