import { create } from "zustand";
import { notification } from "antd";

export type TravelNode = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  type?: string;
  desc?: string;
  /** 所属区域 */
  region?: string;
  /** 开放时间 */
  openHours?: string;
  /** 推荐停留时长（分钟） */
  stayMinutes?: number;
  /** 坐标是否齐全；缺失坐标的景点不能参与路径计算 */
  hasCoordinates: boolean;
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
  setStartId: (id?: string) => void;
  setEndId: (id?: string) => void;
  swap: () => void;
  clear: () => void;
  setSelectedNodeId: (id?: string) => void;
  fetchRoute: () => Promise<void>;
};

const apiBase = import.meta.env.VITE_API_BASE || "/api";

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type RawNode = {
  id?: unknown;
  name?: unknown;
  lat?: unknown;
  lng?: unknown;
  type?: unknown;
  desc?: unknown;
  region?: unknown;
  openHours?: unknown;
  stayMinutes?: unknown;
};

function mapNode(raw: RawNode): TravelNode | null {
  const id = String(raw?.id ?? "").trim();
  if (!id) return null;
  const name = String(raw?.name ?? "").trim();
  const lat = toNumberOrNull(raw?.lat);
  const lng = toNumberOrNull(raw?.lng);
  const stay = toNumberOrNull(raw?.stayMinutes);
  return {
    id,
    name,
    lat,
    lng,
    type: typeof raw?.type === "string" ? raw.type : undefined,
    desc: typeof raw?.desc === "string" ? raw.desc : undefined,
    region: typeof raw?.region === "string" ? raw.region : undefined,
    openHours: typeof raw?.openHours === "string" ? raw.openHours : undefined,
    stayMinutes: stay === null ? undefined : stay,
    hasCoordinates: lat !== null && lng !== null,
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
      const nodes = (data as RawNode[])
        .map(mapNode)
        .filter((n): n is TravelNode => n !== null);
      set({ nodes });
    } catch {
      notification.error({ message: "加载节点失败", description: "请检查后端服务是否已启动" });
    } finally {
      set({ nodesLoading: false });
    }
  },

  setStartId: (id) => {
    if (id && !isRoutable(get().nodes, id)) {
      notification.warning({ message: "该景点缺少坐标", description: "坐标缺失的景点不能参与路径计算，请先在后台补全经纬度" });
      return;
    }
    set({ startId: id, route: undefined });
  },
  setEndId: (id) => {
    if (id && !isRoutable(get().nodes, id)) {
      notification.warning({ message: "该景点缺少坐标", description: "坐标缺失的景点不能参与路径计算，请先在后台补全经纬度" });
      return;
    }
    set({ endId: id, route: undefined });
  },
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
    if (!isRoutable(nodes, startId) || !isRoutable(nodes, endId)) {
      notification.warning({ message: "起点或终点缺少坐标", description: "坐标缺失的景点不能参与路径计算" });
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

function isRoutable(nodes: TravelNode[], id: string): boolean {
  const n = nodes.find((x) => x.id === id);
  return !!n && n.hasCoordinates;
}
