import { Button, Divider, Select, Skeleton, Tag, Typography } from "antd";
import { ArrowLeftRight, Route, Settings, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTravelStore } from "@/stores/useTravelStore";

const { Text } = Typography;

export default function ControlPanel() {
  const navigate = useNavigate();
  const nodes = useTravelStore((s) => s.nodes);
  const nodesLoading = useTravelStore((s) => s.nodesLoading);
  const startId = useTravelStore((s) => s.startId);
  const endId = useTravelStore((s) => s.endId);
  const route = useTravelStore((s) => s.route);
  const routeLoading = useTravelStore((s) => s.routeLoading);
  const setStartId = useTravelStore((s) => s.setStartId);
  const setEndId = useTravelStore((s) => s.setEndId);
  const swap = useTravelStore((s) => s.swap);
  const clear = useTravelStore((s) => s.clear);
  const fetchRoute = useTravelStore((s) => s.fetchRoute);

  const [keyword, setKeyword] = useState<string>("");

  const options = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    const list = k ? nodes.filter((n) => (n.name || "").toLowerCase().includes(k)) : nodes;
    // 坐标缺失的景点不可作为起终点（禁用态展示，避免误选）
    return list.map((n) => ({
      label: n.hasCoordinates ? n.name || n.id : `${n.name || n.id}（缺坐标）`,
      value: n.id,
      disabled: !n.hasCoordinates,
    }));
  }, [keyword, nodes]);

  const missingCount = useMemo(() => nodes.filter((n) => !n.hasCoordinates).length, [nodes]);

  const distanceText = useMemo(() => {
    if (!route) return "";
    const m = route.totalDistanceMeters;
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(2)} km`;
  }, [route]);

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">重庆旅游线路规划</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">数据源：节点库</span>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">权重：地理距离</span>
          </div>
        </div>
        <div className="flex items-center">
          <Button type="text" title="景点节点维护" onClick={() => navigate("/admin")} icon={<Settings className="h-4 w-4" />} />
          <Button type="text" onClick={() => clear()} icon={<X className="h-4 w-4" />} />
        </div>
      </div>

      <Divider className="my-3" />

      {nodesLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          <div className="space-y-2">
            <Text type="secondary">起点</Text>
            <Select
              showSearch
              value={startId}
              placeholder="选择起点"
              options={options}
              className="w-full"
              filterOption={false}
              onSearch={setKeyword}
              onChange={(v) => setStartId(v)}
              allowClear
            />
          </div>

          <div className="mt-3 space-y-2">
            <Text type="secondary">终点</Text>
            <Select
              showSearch
              value={endId}
              placeholder="选择终点"
              options={options}
              className="w-full"
              filterOption={false}
              onSearch={setKeyword}
              onChange={(v) => setEndId(v)}
              allowClear
            />
          </div>

          {missingCount > 0 ? (
            <div className="mt-2 text-xs text-orange-600">
              {missingCount} 个景点坐标缺失，已禁用选择，可在「景点节点维护」中补全。
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button onClick={() => swap()} icon={<ArrowLeftRight className="h-4 w-4" />}>
              交换
            </Button>
            <Button type="primary" loading={routeLoading} onClick={() => fetchRoute()} icon={<Route className="h-4 w-4" />}>
              开始规划
            </Button>
          </div>

          <Divider className="my-4" />

          <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">路径结果</div>
              {route ? <div className="text-xs text-slate-500">{distanceText}</div> : null}
            </div>

            {route ? (
              <div className="mt-3 space-y-2">
                {route.pathNodes.map((n, idx) => (
                  <div key={n.id} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-900">
                        <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs">
                          {idx + 1}
                        </span>
                        {n.name}
                      </div>
                      <div className="text-xs text-slate-500">{n.region || n.type || ""}</div>
                    </div>
                    {n.desc ? <div className="mt-1 text-xs text-slate-600">{n.desc}</div> : null}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {n.openHours ? <Tag className="mr-0 text-xs">开放：{n.openHours}</Tag> : null}
                      {typeof n.stayMinutes === "number" ? <Tag className="mr-0 text-xs" color="blue">建议停留 {n.stayMinutes} 分钟</Tag> : null}
                    </div>
                    {idx > 0 ? (
                      <div className="mt-1 text-xs text-slate-500">
                        与上一点约 {Math.round(route.segmentDistanceMeters[idx - 1])} m
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-600">选择起点与终点后开始规划。</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
