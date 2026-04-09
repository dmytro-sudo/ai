import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Anthropic from 'npm:@anthropic-ai/sdk@0.20.9';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, conversationHistory } = await req.json();

    if (!message) {
      return Response.json({ error: 'Message required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Claude API key not configured' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const messages = conversationHistory || [];
    messages.push({ role: 'user', content: message });

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: messages,
    });

    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : '';

    return Response.json({
      message: assistantMessage,
      role: 'assistant',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});