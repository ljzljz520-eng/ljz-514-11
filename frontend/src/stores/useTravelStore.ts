import { create } from "zustand";
import { notification } from "antd";

export type TravelNode = {
  id: string;
  name: string;
  /** 坐标缺失时为 null，节点不参与路径计算 */
  lat: number | null;
  lng: number | null;
  type?: string;
  desc?: string;
  region?: string;
  openingHours?: string;
  recommendedStayMinutes?: number;
};

/** 新增/编辑景点时提交的字段；lat/lng 可为 null 表示坐标缺失 */
export type NodePayload = {
  id?: string;
  name: string;
  lat?: number | null;
  lng?: number | null;
  type?: string | null;
  desc?: string | null;
  region?: string | null;
  openingHours?: string | null;
  recommendedStayMinutes?: number | null;
};

export type PathResult = {
  startId: string;
  endId: string;
  totalDistanceMeters: number;
  pathNodeIds: string[];
  pathNodes: TravelNode[];
  segmentDistanceMeters: number[];
};

type State = {
  nodes: TravelNode[];
  nodesLoading: boolean;
  startId?: string;
  endId?: string;
  route?: PathResult;
  routeLoading: boolean;
  selectedNodeId?: string;
};

type Actions = {
  loadNodes: () => Promise<void>;
  createNode: (payload: NodePayload) => Promise<boolean>;
  updateNode: (id: string, payload: NodePayload) => Promise<boolean>;
  deleteNode: (id: string) => Promise<boolean>;
  setStartId: (id?: string) => void;
  setEndId: (id?: string) => void;
  swap: () => void;
  clear: () => void;
  setSelectedNodeId: (id?: string) => void;
  fetchRoute: () => Promise<void>;
};

const apiBase = import.meta.env.VITE_API_BASE || "/api";

function normalizeNode(raw: unknown): TravelNode | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const id = String(r.id ?? "").trim();
  const name = String(r.name ?? "").trim();
  if (!id || !name) return null;
  // lat/lng 任一缺失都视为坐标缺失（后端保证成对，但前端做兜底）
  const lat = Number(r.lat);
  const lng = Number(r.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const optStr = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
  const stay = Number(r.recommendedStayMinutes);
  return {
    id,
    name,
    lat: hasCoords ? lat : null,
    lng: hasCoords ? lng : null,
    type: optStr(r.type),
    desc: optStr(r.desc),
    region: optStr(r.region),
    openingHours: optStr(r.openingHours),
    recommendedStayMinutes: Number.isFinite(stay) ? stay : undefined,
  };
}

export const useTravelStore = create<State & Actions>((set, get) => ({
  nodes: [],
  nodesLoading: false,
  routeLoading: false,

  loadNodes: async () => {
    if (get().nodesLoading) return;
    set({ nodesLoading: true });
    try {
      const res = await fetch(`${apiBase}/nodes`);
      if (!res.ok) throw new Error("nodes_fetch_failed");
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("nodes_payload_invalid");
      const nodes = data.map(normalizeNode).filter((n): n is TravelNode => n !== null);
      set({ nodes });
    } catch {
      notification.error({ message: "加载节点失败", description: "请检查后端服务是否已启动" });
    } finally {
      set({ nodesLoading: false });
    }
  },

  createNode: async (payload) => {
    try {
      const res = await fetch(`${apiBase}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        notification.error({ message: "新增景点失败", description: data?.error || "后端错误" });
        return false;
      }
      notification.success({ message: "景点已新增" });
      await get().loadNodes();
      return true;
    } catch {
      notification.error({ message: "新增景点失败", description: "网络异常或后端不可用" });
      return false;
    }
  },

  updateNode: async (id, payload) => {
    try {
      const res = await fetch(`${apiBase}/nodes/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        notification.error({ message: "保存景点失败", description: data?.error || "后端错误" });
        return false;
      }
      notification.success({ message: "景点已更新" });
      await get().loadNodes();
      return true;
    } catch {
      notification.error({ message: "保存景点失败", description: "网络异常或后端不可用" });
      return false;
    }
  },

  deleteNode: async (id) => {
    try {
      const res = await fetch(`${apiBase}/nodes/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        notification.error({ message: "删除景点失败", description: data?.error || "后端错误" });
        return false;
      }
      notification.success({ message: "景点已删除" });
      // 若删除的是当前起/终点，同步清空并作废已有路线
      set((s) => ({
        startId: s.startId === id ? undefined : s.startId,
        endId: s.endId === id ? undefined : s.endId,
        selectedNodeId: s.selectedNodeId === id ? undefined : s.selectedNodeId,
        route: s.startId === id || s.endId === id ? undefined : s.route,
      }));
      await get().loadNodes();
      return true;
    } catch {
      notification.error({ message: "删除景点失败", description: "网络异常或后端不可用" });
      return false;
    }
  },

  setStartId: (id) => set({ startId: id, route: undefined }),
  setEndId: (id) => set({ endId: id, route: undefined }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  swap: () => {
    const { startId, endId } = get();
    set({ startId: endId, endId: startId, route: undefined });
  },

  clear: () => set({ startId: undefined, endId: undefined, route: undefined, selectedNodeId: undefined }),

  fetchRoute: async () => {
    const { startId, endId, nodes } = get();
    if (!startId || !endId) {
      notification.warning({ message: "请选择起点与终点" });
      return;
    }
    const start = nodes.find((n) => n.id === startId);
    const end = nodes.find((n) => n.id === endId);
    if (!start || !end) {
      notification.warning({ message: "请重新选择起点与终点", description: "节点列表可能已更新" });
      return;
    }
    const missing: string[] = [];
    if (start.lat === null || start.lng === null) missing.push(`起点「${start.name}」`);
    if (end.lat === null || end.lng === null) missing.push(`终点「${end.name}」`);
    if (missing.length > 0) {
      notification.warning({
        message: "所选景点坐标缺失，无法规划",
        description: `${missing.join("、")}尚未录入经纬度，请先在景点维护中补全坐标`,
      });
      return;
    }
    set({ routeLoading: true });
    try {
      const qs = new URLSearchParams({ from: startId, to: endId });
      const res = await fetch(`${apiBase}/path?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        notification.error({ message: "规划失败", description: data?.error || "后端错误" });
        return;
      }
      set({ route: data as PathResult });
    } catch {
      notification.error({ message: "规划失败", description: "网络异常或后端不可用" });
    } finally {
      set({ routeLoading: false });
    }
  },
}));
