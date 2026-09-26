import { Badge, Button, Drawer, Input, Popconfirm, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { MapPin, MapPinOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTravelStore, type NodePayload, type TravelNode } from "@/stores/useTravelStore";
import NodeFormModal from "@/components/NodeFormModal";

const { Text } = Typography;

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function NodeManageDrawer({ open, onClose }: Props) {
  const nodes = useTravelStore((s) => s.nodes);
  const nodesLoading = useTravelStore((s) => s.nodesLoading);
  const createNode = useTravelStore((s) => s.createNode);
  const updateNode = useTravelStore((s) => s.updateNode);
  const deleteNode = useTravelStore((s) => s.deleteNode);

  const [keyword, setKeyword] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TravelNode | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return nodes;
    return nodes.filter(
      (n) =>
        n.name.toLowerCase().includes(k) ||
        (n.region || "").toLowerCase().includes(k) ||
        n.id.toLowerCase().includes(k),
    );
  }, [keyword, nodes]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (node: TravelNode) => {
    setEditing(node);
    setFormOpen(true);
  };

  const handleSubmit = async (payload: NodePayload) => {
    setSubmitting(true);
    try {
      const ok = editing ? await updateNode(editing.id, payload) : await createNode(payload);
      if (ok) setFormOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteNode(id);
  };

  const columns: ColumnsType<TravelNode> = [
    {
      title: "景点",
      dataIndex: "name",
      key: "name",
      width: 160,
      render: (name: string, record) => (
        <div>
          <div className="font-medium text-slate-900">{name}</div>
          <div className="text-xs text-slate-400">{record.id}</div>
        </div>
      ),
    },
    {
      title: "所属区域",
      dataIndex: "region",
      key: "region",
      width: 96,
      render: (v?: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "经纬度",
      key: "coords",
      width: 180,
      render: (_, record) =>
        record.lat !== null && record.lng !== null ? (
          <span className="text-xs text-slate-600">
            {record.lat.toFixed(5)}, {record.lng.toFixed(5)}
          </span>
        ) : (
          <Badge status="warning" text={<span className="text-xs">坐标缺失</span>} />
        ),
    },
    {
      title: "开放时间",
      dataIndex: "openingHours",
      key: "openingHours",
      width: 150,
      render: (v?: string) =>
        v ? <span className="text-xs text-slate-600">{v}</span> : <Text type="secondary">—</Text>,
    },
    {
      title: "建议停留",
      dataIndex: "recommendedStayMinutes",
      key: "recommendedStayMinutes",
      width: 90,
      render: (v?: number) => (v ? <Tag>{v} 分钟</Tag> : <Text type="secondary">—</Text>),
    },
    {
      title: "可规划",
      key: "routable",
      width: 88,
      render: (_, record) =>
        record.lat !== null && record.lng !== null ? (
          <Tag icon={<MapPin className="h-3 w-3" />} color="success">
            是
          </Tag>
        ) : (
          <Tag icon={<MapPinOff className="h-3 w-3" />} color="warning">
            否
          </Tag>
        ),
    },
    {
      title: "操作",
      key: "actions",
      width: 96,
      render: (_, record) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<Pencil className="h-4 w-4" />} onClick={() => openEdit(record)} />
          <Popconfirm
            title={`删除景点「${record.name}」？`}
            description="删除后不可恢复"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="text" size="small" danger icon={<Trash2 className="h-4 w-4" />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Drawer
        title="景点节点维护"
        placement="right"
        width={860}
        open={open}
        onClose={onClose}
        destroyOnClose
        extra={
          <Button type="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            新增景点
          </Button>
        }
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <Input.Search
            allowClear
            placeholder="搜索景点名称 / 区域 / ID"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          <Text type="secondary" className="text-xs">
            共 {nodes.length} 个景点，其中 {nodes.filter((n) => n.lat === null || n.lng === null).length} 个坐标缺失（不可规划）
          </Text>
        </div>

        <Table<TravelNode>
          rowKey="id"
          size="small"
          loading={nodesLoading}
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 820 }}
          pagination={{ pageSize: 8, showSizeChanger: false }}
        />

        <NodeFormModal
          open={formOpen}
          node={editing}
          submitting={submitting}
          onCancel={() => setFormOpen(false)}
          onSubmit={handleSubmit}
        />
      </Drawer>
    </>
  );
}
