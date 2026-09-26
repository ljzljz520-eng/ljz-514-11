import { Button, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, Tag, Typography, notification } from "antd";
import { ArrowLeft, MapPinOff, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createNode, deleteNode, updateNode, type NodePayload } from "@/lib/nodeApi";
import { useTravelStore, type TravelNode } from "@/stores/useTravelStore";

const { Text } = Typography;

type FormValues = {
  name: string;
  region?: string;
  type?: string;
  lat?: number | null;
  lng?: number | null;
  openHours?: string;
  stayMinutes?: number | null;
  desc?: string;
};

export default function Admin() {
  const navigate = useNavigate();
  const nodes = useTravelStore((s) => s.nodes);
  const nodesLoading = useTravelStore((s) => s.nodesLoading);
  const loadNodes = useTravelStore((s) => s.loadNodes);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TravelNode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (nodes.length === 0 && !nodesLoading) {
      void loadNodes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const missingCount = useMemo(() => nodes.filter((n) => !n.hasCoordinates).length, [nodes]);

  // 编辑时以 initialValues 回填（Modal destroyOnClose 保证每次打开都是全新表单）
  const initialValues = useMemo<Partial<FormValues>>(() => {
    if (!editing) return {};
    return {
      name: editing.name,
      region: editing.region,
      type: editing.type,
      lat: editing.lat,
      lng: editing.lng,
      openHours: editing.openHours,
      stayMinutes: editing.stayMinutes ?? null,
      desc: editing.desc,
    };
  }, [editing]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (n: TravelNode) => {
    setEditing(n);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const hasLat = values.lat !== null && values.lat !== undefined;
    const hasLng = values.lng !== null && values.lng !== undefined;
    if (hasLat !== hasLng) {
      notification.warning({ message: "经纬度需同时填写或同时留空" });
      return;
    }

    const payload: NodePayload = {
      name: values.name.trim(),
      lat: hasLat ? values.lat : null,
      lng: hasLng ? values.lng : null,
      region: values.region?.trim() || undefined,
      type: values.type?.trim() || undefined,
      openHours: values.openHours?.trim() || undefined,
      stayMinutes: values.stayMinutes ?? null,
      desc: values.desc?.trim() || undefined,
    };

    setSubmitting(true);
    try {
      if (editing) {
        await updateNode(editing.id, payload);
        notification.success({ message: "景点已更新", description: payload.name });
      } else {
        await createNode(payload);
        notification.success({ message: "景点已新增", description: payload.name });
      }
      setModalOpen(false);
      setEditing(null);
      await loadNodes();
    } catch (e) {
      notification.error({ message: editing ? "更新失败" : "新增失败", description: e instanceof Error ? e.message : "未知错误" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (n: TravelNode) => {
    setDeletingId(n.id);
    try {
      await deleteNode(n.id);
      notification.success({ message: "景点已删除", description: n.name });
      await loadNodes();
    } catch (e) {
      notification.error({ message: "删除失败", description: e instanceof Error ? e.message : "未知错误" });
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      render: (v: string, r: TravelNode) => (
        <div>
          <div className="font-medium text-slate-900">{v}</div>
          <div className="text-xs text-slate-400">{r.id}</div>
        </div>
      ),
    },
    {
      title: "所属区域",
      dataIndex: "region",
      key: "region",
      render: (v?: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "坐标",
      key: "coord",
      render: (_: unknown, r: TravelNode) =>
        r.hasCoordinates ? (
          <span className="text-xs text-slate-600">
            {r.lat!.toFixed(5)}, {r.lng!.toFixed(5)}
          </span>
        ) : (
          <Tag icon={<MapPinOff className="mr-1 inline h-3 w-3" />} color="orange">
            坐标缺失
          </Tag>
        ),
    },
    {
      title: "开放时间",
      dataIndex: "openHours",
      key: "openHours",
      render: (v?: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "推荐停留",
      dataIndex: "stayMinutes",
      key: "stayMinutes",
      render: (v?: number) => (typeof v === "number" ? `${v} 分钟` : <Text type="secondary">—</Text>),
    },
    {
      title: "路径计算",
      key: "routable",
      render: (_: unknown, r: TravelNode) =>
        r.hasCoordinates ? <Tag color="green">可参与</Tag> : <Tag color="default">不参与</Tag>,
    },
    {
      title: "操作",
      key: "actions",
      width: 150,
      render: (_: unknown, r: TravelNode) => (
        <Space size="small">
          <Button size="small" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Popconfirm
            title="删除景点"
            description={`确定删除「${r.name}」吗？`}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true, loading: deletingId === r.id }}
            onConfirm={() => handleDelete(r)}
          >
            <Button size="small" danger icon={<Trash2 className="h-3.5 w-3.5" />} loading={deletingId === r.id} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-slate-900">景点节点维护</div>
            <div className="mt-1 text-sm text-slate-500">
              共 {nodes.length} 个景点
              {missingCount > 0 ? (
                <span className="ml-2 text-orange-600">{missingCount} 个坐标缺失，不参与路径计算</span>
              ) : (
                <span className="ml-2 text-slate-400">全部坐标齐全</span>
              )}
            </div>
          </div>
          <Space>
            <Button icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate("/")}>
              返回地图
            </Button>
            <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => loadNodes()} loading={nodesLoading}>
              刷新
            </Button>
            <Button type="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              新增景点
            </Button>
          </Space>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <Table<TravelNode>
            rowKey="id"
            columns={columns}
            dataSource={nodes}
            loading={nodesLoading}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            locale={{ emptyText: "暂无景点数据" }}
          />
        </div>
      </div>

      <Modal
        title={editing ? `编辑景点：${editing.name}` : "新增景点"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        okText={editing ? "保存" : "创建"}
        cancelText="取消"
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form
          key={editing ? editing.id : "create"}
          form={form}
          layout="vertical"
          className="mt-2"
          preserve={false}
          initialValues={initialValues}
        >
          <Form.Item
            name="name"
            label="景点名称"
            rules={[
              { required: true, message: "请输入景点名称" },
              { max: 100, message: "名称不能超过 100 字" },
            ]}
          >
            <Input placeholder="如：洪崖洞" allowClear />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="region" label="所属区域" rules={[{ max: 200, message: "不能超过 200 字" }]}>
              <Input placeholder="如：渝中区" allowClear />
            </Form.Item>
            <Form.Item name="type" label="类型" rules={[{ max: 200, message: "不能超过 200 字" }]}>
              <Input placeholder="如：景区 / 博物馆" allowClear />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="lat"
              label="纬度（可留空）"
              rules={[{ type: "number", min: -90, max: 90, message: "纬度需在 -90 到 90 之间" }]}
            >
              <InputNumber className="w-full" placeholder="如：29.56301" step={0.00001} />
            </Form.Item>
            <Form.Item
              name="lng"
              label="经度（可留空）"
              rules={[{ type: "number", min: -180, max: 180, message: "经度需在 -180 到 180 之间" }]}
            >
              <InputNumber className="w-full" placeholder="如：106.57577" step={0.00001} />
            </Form.Item>
          </div>
          <div className="-mt-2 mb-3 text-xs text-slate-400">经纬度需同时填写或同时留空；坐标缺失的景点不参与路径计算。</div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="openHours" label="开放时间" rules={[{ max: 200, message: "不能超过 200 字" }]}>
              <Input placeholder="如：09:00-17:00 / 全天开放" allowClear />
            </Form.Item>
            <Form.Item
              name="stayMinutes"
              label="推荐停留时长（分钟）"
              rules={[{ type: "number", min: 0, max: 1440, message: "需在 0 到 1440 分钟之间" }]}
            >
              <InputNumber className="w-full" placeholder="如：90" step={10} />
            </Form.Item>
          </div>

          <Form.Item name="desc" label="描述" rules={[{ max: 2000, message: "不能超过 2000 字" }]}>
            <Input.TextArea rows={3} placeholder="一句话介绍该景点" allowClear />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
