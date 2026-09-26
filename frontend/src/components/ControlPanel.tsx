import { Badge, Button, Divider, Select, Skeleton, Tag, Tooltip, Typography } from "antd";
import { ArrowLeftRight, Route, Settings2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTravelStore } from "@/stores/useTravelStore";
import NodeManageDrawer from "@/components/NodeManageDrawer";

const { Text } = Typography;

export default function ControlPanel() {
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
  const [manageOpen, setManageOpen] = useState(false);

  // 只有坐标完整的节点才能作为起点/终点参与路径计算
  const routableNodes = useMemo(
    () => nodes.filter((n) => n.lat !== null && n.lng !== null),
    [nodes],
  );
  const missingCount = nodes.length - routableNodes.length;

  const buildOptions = (selectedId?: string) => {
    const k = keyword.trim().toLowerCase();
    const list = k ? routableNodes.filter((n) => (n.name || "").toLowerCase().includes(k)) : routableNodes;
    const opts = list.map((n) => ({
      label: n.region ? `${n.name || n.id}（${n.region}）` : n.name || n.id,
      value: n.id,
    }));
    // 兜底：若当前选中项已失效（理论上不会），仍展示出来
    if (selectedId && !routableNodes.some((n) => n.id === selectedId)) {
      opts.unshift({ label: `已失效（${selectedId}）`, value: selectedId });
    }
    return opts;
  };

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
            <Tooltip title={missingCount > 0 ? `有 ${missingCount} 个景点坐标缺失，需补全后才能参与规划` : "所有景点坐标完整"}>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                <Badge status={missingCount > 0 ? "warning" : "success"} />
                景点 {nodes.length}
              </span>
            </Tooltip>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">权重：地理距离</span>
          </div>
        </div>
        <Button type="text" onClick={() => clear()} icon={<X className="h-4 w-4" />} />
      </div>

      <Button
        className="mt-3"
        icon={<Settings2 className="h-4 w-4" />}
        onClick={() => setManageOpen(true)}
      >
        景点节点维护
      </Button>

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
              placeholder="选择起点（仅坐标完整的景点）"
              options={buildOptions(startId)}
              className="w-full"
              filterOption={false}
              onSearch={setKeyword}
              onChange={(v) => setStartId(v)}
              allowClear
              notFoundContent={routableNodes.length === 0 ? "暂无坐标完整的景点，请先维护" : "未找到匹配景点"}
            />
          </div>

          <div className="mt-3 space-y-2">
            <Text type="secondary">终点</Text>
            <Select
              showSearch
              value={endId}
              placeholder="选择终点（仅坐标完整的景点）"
              options={buildOptions(endId)}
              className="w-full"
              filterOption={false}
              onSearch={setKeyword}
              onChange={(v) => setEndId(v)}
              allowClear
              notFoundContent={routableNodes.length === 0 ? "暂无坐标完整的景点，请先维护" : "未找到匹配景点"}
            />
          </div>

          {missingCount > 0 ? (
            <div className="mt-2 text-xs text-amber-600">
              {missingCount} 个景点坐标缺失，已从起终点列表中排除，可在“景点节点维护”中补全。
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
                      <div className="text-xs text-slate-500">{n.type || ""}</div>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                      {n.region ? <Tag className="m-0">{n.region}</Tag> : null}
                      {n.openingHours ? <span>开放：{n.openingHours}</span> : null}
                      {n.recommendedStayMinutes ? <span>建议停留 {n.recommendedStayMinutes} 分钟</span> : null}
                    </div>
                    {n.desc ? <div className="mt-1 text-xs text-slate-600">{n.desc}</div> : null}
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

      <NodeManageDrawer open={manageOpen} onClose={() => setManageOpen(false)} />
    </div>
  );
}
