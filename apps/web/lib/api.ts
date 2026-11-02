import type { components } from '../../../packages/contracts/api.generated';

export type Role = components['schemas']['Role'];
export type User = components['schemas']['User'];
export type Workspace = components['schemas']['Workspace'];
export type Member = components['schemas']['Member'];
export type Invitation = components['schemas']['Invitation'];
export type Identity = components['schemas']['Identity'];
export type AuditEvent = components['schemas']['AuditEvent'];

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function api<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, { method, credentials: 'include', cache: 'no-store', headers: data === undefined ? undefined : { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
  } catch { throw new ApiError('Không kết nối được máy chủ. Hãy kiểm tra API đang chạy.', 0); }
  const body = response.status === 204 ? undefined : await response.json();
  if (!response.ok) throw new ApiError(body?.message ?? `Yêu cầu thất bại (${response.status})`, response.status);
  return body as T;
}

export function message(error: unknown) { return error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.'; }
