import { create } from "zustand";
import { notification } from "antd";

export type TravelNode = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  type?: string;
  desc?: string;
  region?: string;
  openTime?: string;
  stayMinutes?: number | null;
};

export type NodePayload = {
  name: string;
  lat?: number | null;
  lng?: number | null;
  region?: string;
  openTime?: string;
  stayMinutes?: number | null;
  type?: string;
  desc?: string;
};

export type PathResult = {
  startId: string;
  endId: string;
  totalDistanceMeters: number;
  pathNodeIds: string[];
  pathNodes: TravelNode[];
  segmentDistanceMeters: number[];
};

/** 坐标是否完整：缺失坐标的景点不能参与路径计算 */
export const hasCoords = (n: Pick<TravelNode, "lat" | "lng">): boolean =>
  typeof n.lat === "number" && Number.isFinite(n.lat) && typeof n.lng === "number" && Number.isFinite(n.lng);

type State = {
  nodes: TravelNode[];
  nodesLoading: boolean;
  startId?: string;
  endId?: string;
  route?: PathResult;
  routeLoading: boolean;
  selectedNodeId?: string;
  savingNode: boolean;
};

type Actions = {
  loadNodes: () => Promise<void>;
  setStartId: (id?: string) => void;
  setEndId: (id?: string) => void;
  swap: () => void;
  clear: () => void;
  setSelectedNodeId: (id?: string) => void;
  fetchRoute: () => Promise<void>;
  createNode: (payload: NodePayload) => Promise<boolean>;
  updateNode: (id: string, payload: Partial<NodePayload>) => Promise<boolean>;
};

const apiBase = import.meta.env.VITE_API_BASE || "/api";

const toNumberOrNull = (raw: unknown): number | null => {
  if (raw === null || raw === undefined || raw === "") return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
};

type RawNode = Record<string, unknown>;

const parseNode = (raw: RawNode): TravelNode => ({
  id: String(raw?.id ?? "").trim(),
  name: String(raw?.name ?? "").trim(),
  lat: toNumberOrNull(raw?.lat),
  lng: toNumberOrNull(raw?.lng),
  type: typeof raw?.type === "string" ? raw.type : undefined,
  desc: typeof raw?.desc === "string" ? raw.desc : undefined,
  region: typeof raw?.region === "string" ? raw.region : undefined,
  openTime: typeof raw?.openTime === "string" ? raw.openTime : undefined,
  stayMinutes: toNumberOrNull(raw?.stayMinutes),
});

export const useTravelStore = create<State & Actions>((set, get) => ({
  nodes: [],
  nodesLoading: false,
  routeLoading: false,
  savingNode: false,

  loadNodes: async () => {
    if (get().nodesLoading) return;
    set({ nodesLoading: true });
    try {
      const res = await fetch(`${apiBase}/nodes`);
      if (!res.ok) throw new Error("nodes_fetch_failed");
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("nodes_payload_invalid");
      const nodes = (data as RawNode[]).map(parseNode).filter((n) => n.id);
      set({ nodes });
    } catch {
      notification.error({ message: "加载节点失败", description: "请检查后端服务是否已启动" });
    } finally {
      set({ nodesLoading: false });
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
    if ((start && !hasCoords(start)) || (end && !hasCoords(end))) {
      notification.warning({ message: "起点或终点缺少坐标", description: "请先在节点管理中补录经纬度" });
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

  createNode: async (payload) => {
    set({ savingNode: true });
    try {
      const res = await fetch(`${apiBase}/admin/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notification.error({ message: "新增景点失败", description: data?.error || "后端错误" });
        return false;
      }
      notification.success({ message: "新增景点成功" });
      await get().loadNodes();
      return true;
    } catch {
      notification.error({ message: "新增景点失败", description: "网络异常或后端不可用" });
      return false;
    } finally {
      set({ savingNode: false });
    }
  },

  updateNode: async (id, payload) => {
    set({ savingNode: true });
    try {
      const res = await fetch(`${apiBase}/admin/nodes?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notification.error({ message: "更新景点失败", description: data?.error || "后端错误" });
        return false;
      }
      notification.success({ message: "更新景点成功" });
      await get().loadNodes();
      return true;
    } catch {
      notification.error({ message: "更新景点失败", description: "网络异常或后端不可用" });
      return false;
    } finally {
      set({ savingNode: false });
    }
  },
}));
