import { describe, expect, it } from 'vitest';
import {
  JsonRpcRemoteError,
  createErrorResponse,
  createRequest,
  parseMessageLine,
  serializeMessage,
} from '../../src/rpc/jsonrpc.js';

describe('createRequest', () => {
  it('JSON-RPC 2.0 요청 객체 생성', () => {
    const req = createRequest(1, 'stock.current_price', { ticker: '005930' });
    expect(req).toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'stock.current_price',
      params: { ticker: '005930' },
    });
  });

  it('params 생략 시 undefined', () => {
    const req = createRequest(42, 'rpc.list_methods');
    expect(req).toEqual({
      jsonrpc: '2.0',
      id: 42,
      method: 'rpc.list_methods',
      params: undefined,
    });
  });

  it('문자열 id 허용', () => {
    const req = createRequest('abc', 'test.method');
    expect(req.id).toBe('abc');
  });
});

describe('createErrorResponse', () => {
  it('에러 응답 객체 생성', () => {
    const res = createErrorResponse(1, -32601, 'Method not found');
    expect(res).toEqual({
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: -32601,
        message: 'Method not found',
        data: undefined,
      },
    });
  });

  it('data 포함 에러 응답', () => {
    const res = createErrorResponse(2, -32602, 'Invalid params', { missing: ['ticker'] });
    expect(res.error.data).toEqual({ missing: ['ticker'] });
  });
});

describe('serializeMessage', () => {
  it('JSON 직렬화 + 개행 문자 추가', () => {
    const msg = createRequest(1, 'test');
    const serialized = serializeMessage(msg);
    expect(serialized).toBe('{"jsonrpc":"2.0","id":1,"method":"test"}\n');
    expect(serialized.endsWith('\n')).toBe(true);
  });

  it('개행이 정확히 1개', () => {
    const msg = createRequest(1, 'test');
    const serialized = serializeMessage(msg);
    const newlines = serialized.split('\n').length - 1;
    expect(newlines).toBe(1);
  });
});

describe('parseMessageLine', () => {
  it('유효한 JSON-RPC 메시지 파싱', () => {
    const line = '{"jsonrpc":"2.0","id":1,"result":"ok"}';
    const parsed = parseMessageLine(line);
    expect(parsed).toEqual({ jsonrpc: '2.0', id: 1, result: 'ok' });
  });

  it('잘못된 JSON이면 에러', () => {
    expect(() => parseMessageLine('not-json')).toThrow();
  });

  it('jsonrpc 필드가 없으면 에러', () => {
    expect(() => parseMessageLine('{"id":1,"result":"ok"}')).toThrow('Invalid JSON-RPC 2.0 message');
  });

  it('jsonrpc 버전이 다르면 에러', () => {
    expect(() => parseMessageLine('{"jsonrpc":"1.0","id":1}')).toThrow(
      'Invalid JSON-RPC 2.0 message',
    );
  });

  it('null 값이면 에러', () => {
    expect(() => parseMessageLine('null')).toThrow('Invalid JSON-RPC 2.0 message');
  });
});

describe('JsonRpcRemoteError', () => {
  it('Error 인스턴스', () => {
    const err = new JsonRpcRemoteError(-32600, 'Invalid Request');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(JsonRpcRemoteError);
  });

  it('code, message, data 속성', () => {
    const err = new JsonRpcRemoteError(-32600, 'Invalid Request', { detail: 'bad' });
    expect(err.code).toBe(-32600);
    expect(err.message).toBe('Invalid Request');
    expect(err.data).toEqual({ detail: 'bad' });
    expect(err.name).toBe('JsonRpcRemoteError');
  });

  it('data 생략 시 undefined', () => {
    const err = new JsonRpcRemoteError(-32600, 'Invalid Request');
    expect(err.data).toBeUndefined();
  });
});
