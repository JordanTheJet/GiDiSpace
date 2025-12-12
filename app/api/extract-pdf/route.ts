import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = '';
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const parsed = await pdfParse(buffer);
      text = parsed.text?.trim() || '';
    } catch (err) {
      console.warn('pdf-parse unavailable, returning placeholder text');
      text = `Received ${file.name || 'PDF'} (${buffer.length} bytes). Text extraction is not available in this environment.`;
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Error extracting PDF:', error);
    return NextResponse.json({ error: 'Failed to process PDF' }, { status: 500 });
  }
}
