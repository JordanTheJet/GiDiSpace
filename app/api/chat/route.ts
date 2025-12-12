import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

function buildReply(messages: Array<{ role: string; content: string }>): string {
  const latestUser = [...(messages || [])]
    .reverse()
    .find((m) => m.role === 'user')?.content;

  const sanitized = latestUser?.toString().slice(0, 280) || 'Hello there';
  return `👋 Got it: ${sanitized}. I’m here in GiDiSpace if you want to explore or meet others.`;
}

export async function POST(req: NextRequest) {
  let body: { messages?: Array<{ role: string; content: string }> } = {};
  try {
    body = await req.json();
  } catch (error) {
    // fall through to default response
  }

  const reply = buildReply(body.messages || []);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const chunk = {
        choices: [{ delta: { content: reply } }],
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
