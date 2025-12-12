// app/api/chat/route.ts - Chat API endpoint for NPC and Digital Twin conversations
import { NextRequest, NextResponse } from 'next/server';

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface ChatRequest {
    messages: Message[];
}

// Anthropic API call with streaming
async function callAnthropic(messages: Message[]): Promise<ReadableStream> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Extract system message and convert to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const conversationMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
        }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: process.env.DEFAULT_LLM_MODEL || 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            system: systemMessage,
            messages: conversationMessages,
            stream: true,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    // Transform Anthropic SSE to OpenAI-compatible format
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    return new ReadableStream({
        async start(controller) {
            const reader = response.body?.getReader();
            if (!reader) {
                controller.close();
                return;
            }

            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(data);

                                // Handle content_block_delta events
                                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                                    // Convert to OpenAI-compatible format
                                    const openAIFormat = {
                                        choices: [{
                                            delta: {
                                                content: parsed.delta.text
                                            }
                                        }]
                                    };
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
                                }
                            } catch {
                                // Ignore parsing errors for non-JSON lines
                            }
                        }
                    }
                }

                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
            } catch (error) {
                controller.error(error);
            }
        }
    });
}

// OpenAI API call with streaming (fallback)
async function callOpenAI(messages: Message[]): Promise<ReadableStream> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: messages,
            stream: true,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    // OpenAI already returns correct SSE format, just pass through
    return response.body!;
}

// Fallback responses when no API is available
function getFallbackResponse(messages: Message[]): string {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';

    // Extract name from system message if present
    const nameMatch = systemMessage.match(/You are (\w+)/i);
    const name = nameMatch ? nameMatch[1] : 'the assistant';

    const greetings = ['hi', 'hello', 'hey', 'greetings'];
    const isGreeting = greetings.some(g => lastUserMessage.toLowerCase().includes(g));

    if (isGreeting) {
        return `Hello! I'm ${name}. How can I help you today?`;
    }

    const responses = [
        `That's an interesting point! I'd love to discuss that further.`,
        `I appreciate you sharing that with me. Tell me more!`,
        `That's a great question. Let me think about that...`,
        `I find that fascinating! What else would you like to know?`,
        `Thanks for chatting with me! Is there anything specific I can help with?`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
}

export async function POST(request: NextRequest) {
    try {
        const body: ChatRequest = await request.json();
        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Messages array is required' },
                { status: 400 }
            );
        }

        const provider = process.env.DEFAULT_LLM_PROVIDER || 'openai';

        try {
            let stream: ReadableStream;

            if (provider === 'openai' && process.env.OPENAI_API_KEY) {
                stream = await callOpenAI(messages);
            } else if (process.env.ANTHROPIC_API_KEY) {
                stream = await callAnthropic(messages);
            } else {
                // No API keys configured - return fallback response
                const fallbackText = getFallbackResponse(messages);
                const encoder = new TextEncoder();

                stream = new ReadableStream({
                    start(controller) {
                        // Send response in chunks to simulate streaming
                        const words = fallbackText.split(' ');
                        let index = 0;

                        const sendNext = () => {
                            if (index < words.length) {
                                const word = words[index] + (index < words.length - 1 ? ' ' : '');
                                const data = {
                                    choices: [{
                                        delta: { content: word }
                                    }]
                                };
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                                index++;
                                setTimeout(sendNext, 50);
                            } else {
                                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                                controller.close();
                            }
                        };

                        sendNext();
                    }
                });
            }

            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });

        } catch (apiError) {
            console.error('API call failed, using fallback:', apiError);

            // Return fallback response on API error
            const fallbackText = getFallbackResponse(messages);
            const encoder = new TextEncoder();

            const stream = new ReadableStream({
                start(controller) {
                    const data = {
                        choices: [{
                            delta: { content: fallbackText }
                        }]
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                }
            });

            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        }

    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: 'Failed to process chat request' },
            { status: 500 }
        );
    }
}
