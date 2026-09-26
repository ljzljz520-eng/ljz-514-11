import type { TravelNode } from "@/stores/useTravelStore";

const apiBase = import.meta.env.VITE_API_BASE || "/api";

/** 新增/更新景点的提交载荷（id 由后端生成或路径指定） */
export type NodePayload = {
  name: string;
  lat?: number | null;
  lng?: number | null;
  region?: string;
  openHours?: string;
  stayMinutes?: number | null;
  type?: string;
  desc?: string;
};

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data.error === "string" && data.error.trim()) return data.error;
  } catch {
    // ignore
  }
  return `请求失败（HTTP ${res.status}）`;
}

export async function createNode(payload: NodePayload): Promise<TravelNode> {
  const res = await fetch(`${apiBase}/admin/nodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as TravelNode;
}

export async function updateNode(id: string, payload: NodePayload): Promise<TravelNode> {
  const res = await fetch(`${apiBase}/admin/nodes/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as TravelNode;
}

export async function deleteNode(id: string): Promise<void> {
  const res = await fetch(`${apiBase}/admin/nodes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await parseError(res));
}
