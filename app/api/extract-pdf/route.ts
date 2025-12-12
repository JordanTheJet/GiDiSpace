// app/api/extract-pdf/route.ts - PDF text extraction endpoint
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        if (file.type !== 'application/pdf') {
            return NextResponse.json(
                { error: 'File must be a PDF' },
                { status: 400 }
            );
        }

        // For now, we'll use a simple text extraction
        // In production, you'd want to use a proper PDF parsing library
        // or forward to the Python backend

        // Try forwarding to Python backend first
        try {
            const backendFormData = new FormData();
            backendFormData.append('file', file);

            const backendResponse = await fetch(`${BACKEND_URL}/extract-pdf`, {
                method: 'POST',
                body: backendFormData,
            });

            if (backendResponse.ok) {
                const data = await backendResponse.json();
                return NextResponse.json(data);
            }
        } catch (backendError) {
            console.log('Backend PDF extraction not available, using fallback');
        }

        // Fallback: Read file as text (works for some PDFs with embedded text)
        // For a production app, you'd want to use pdf-parse or similar
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Simple PDF text extraction (basic implementation)
        let text = '';
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const rawText = decoder.decode(uint8Array);

        // Extract text between stream markers (simplified PDF parsing)
        const streamMatches = rawText.match(/stream[\s\S]*?endstream/g);
        if (streamMatches) {
            streamMatches.forEach(stream => {
                // Try to extract readable text
                const readable = stream
                    .replace(/stream|endstream/g, '')
                    .replace(/[^\x20-\x7E\s]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                if (readable.length > 10) {
                    text += readable + ' ';
                }
            });
        }

        // Also try to find text in parentheses (common in PDFs)
        const parenMatches = rawText.match(/\(([^)]+)\)/g);
        if (parenMatches) {
            parenMatches.forEach(match => {
                const content = match.slice(1, -1);
                if (content.length > 2 && /[a-zA-Z]/.test(content)) {
                    text += content + ' ';
                }
            });
        }

        // Clean up the extracted text
        text = text
            .replace(/\s+/g, ' ')
            .replace(/[^\x20-\x7E\s]/g, '')
            .trim();

        if (!text || text.length < 50) {
            return NextResponse.json({
                text: '',
                warning: 'Could not extract meaningful text from PDF. Please copy and paste your profile information manually.',
                filename: file.name
            });
        }

        return NextResponse.json({
            text: text.substring(0, 10000), // Limit to 10k chars
            filename: file.name,
            charCount: text.length
        });

    } catch (error) {
        console.error('Error extracting PDF:', error);
        return NextResponse.json(
            { error: 'Failed to process PDF' },
            { status: 500 }
        );
    }
}

export const config = {
    api: {
        bodyParser: false,
    },
};
