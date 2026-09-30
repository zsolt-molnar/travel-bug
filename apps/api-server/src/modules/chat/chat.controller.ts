import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { runMockConciergeGraph } from '@travel-bug/agent-core';
import { Identity, type RequestIdentity } from '../../auth/identity';

@Controller('chat')
export class ChatController {
  @Post()
  async chat(
    @Identity() identity: RequestIdentity,
    @Body() body: { messages?: Array<{ role: string; content: string }> },
    @Res() res: Response,
  ) {
    const lastUser =
      [...(body.messages ?? [])].reverse().find((m) => m.role === 'user')?.content ?? '';

    const result = await runMockConciergeGraph({
      message: lastUser,
      userId: identity.userId,
      operatorId: identity.operatorId ?? undefined,
    });

    // AI SDK data stream protocol (compatible with useChat default)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Vercel-AI-Data-Stream', 'v1');

    const id = `msg_${Date.now()}`;
    res.write(`f:{"messageId":"${id}"}\n`);

    // Stream text in small chunks
    const chunks = result.text.match(/.{1,12}/g) ?? [result.text];
    for (const chunk of chunks) {
      res.write(`0:${JSON.stringify(chunk)}\n`);
    }

    for (const tool of result.tools) {
      const callId = `call_${Math.random().toString(36).slice(2)}`;
      res.write(
        `9:${JSON.stringify({ toolCallId: callId, toolName: tool.name, args: tool.args })}\n`,
      );
      res.write(`a:${JSON.stringify({ toolCallId: callId, result: tool.args })}\n`);
    }

    res.write(
      `e:${JSON.stringify({ finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 }, isContinued: false })}\n`,
    );
    res.write(`d:${JSON.stringify({ finishReason: 'stop' })}\n`);
    res.end();
  }
}
