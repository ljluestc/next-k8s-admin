import crypto from 'crypto';
import { NextResponse } from 'next/server';

const TRACEPARENT_REGEX = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;

export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: string;
  traceparent: string;
  parentSpanId?: string;
}

function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString('hex');
}

function parseTraceparent(traceparent: string | null): { traceId: string; parentSpanId: string; traceFlags: string } | null {
  if (!traceparent) return null;
  const match = traceparent.trim().match(TRACEPARENT_REGEX);
  if (!match) return null;
  return {
    traceId: match[1],
    parentSpanId: match[2],
    traceFlags: match[3],
  };
}

export function createTraceContext(headers: Headers): TraceContext {
  const parsed = parseTraceparent(headers.get('traceparent'));
  const traceId = parsed?.traceId || randomHex(16);
  const spanId = randomHex(8);
  const traceFlags = parsed?.traceFlags || '01';
  return {
    traceId,
    spanId,
    traceFlags,
    traceparent: `00-${traceId}-${spanId}-${traceFlags}`,
    parentSpanId: parsed?.parentSpanId,
  };
}

export function attachTraceHeaders(res: NextResponse, trace: TraceContext): void {
  res.headers.set('x-trace-id', trace.traceId);
  res.headers.set('traceparent', trace.traceparent);
}

export function logTraceEvent(
  trace: TraceContext,
  event: string,
  attributes: Record<string, unknown> = {},
): void {
  console.info(
    JSON.stringify({
      level: 'info',
      type: 'distributed_trace_event',
      event,
      trace_id: trace.traceId,
      span_id: trace.spanId,
      parent_span_id: trace.parentSpanId || null,
      trace_flags: trace.traceFlags,
      timestamp: new Date().toISOString(),
      attributes,
    }),
  );
}
