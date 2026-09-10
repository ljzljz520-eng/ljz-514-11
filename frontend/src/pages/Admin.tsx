import { Alert, Button, Form, Input, InputNumber, Modal, Skeleton, Table, Tag, Typography } from "antd";
import { ArrowLeft, MapPin, Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { hasCoords, useTravelStore, type NodePayload, type TravelNode } from "@/stores/useTravelStore";

const { Text } = Typography;

type FormValues = {
  name: string;
  region?: string;
  lat?: number | null;
  lng?: number | null;
  openTime?: string;
  stayMinutes?: number | null;
  type?: string;
  desc?: string;
};

export default function Admin() {
  const nodes = useTravelStore((s) => s.nodes);
  const nodesLoading = useTravelStore((s) => s.nodesLoading);
  const savingNode = useTravelStore((s) => s.savingNode);
  const loadNodes = useTravelStore((s) => s.loadNodes);
  const createNode = useTravelStore((s) => s.createNode);
  const updateNode = useTravelStore((s) => s.updateNode);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TravelNode | null>(null);
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    void loadNodes();
  }, [loadNodes]);

  const missingCount = useMemo(() => nodes.filter((n) => !hasCoords(n)).length, [nodes]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (node: TravelNode) => {
    setEditing(node);
    form.setFieldsValue({
      name: node.name,
      region: node.region,
      lat: node.lat,
      lng: node.lng,
      openTime: node.openTime,
      stayMinutes: node.stayMinutes ?? null,
      type: node.type,
      desc: node.desc,
    });
    setModalOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    const payload: NodePayload = {
      name: values.name,
      region: values.region || undefined,
      openTime: values.openTime || undefined,
      type: values.type || undefined,
      desc: values.desc || undefined,
      lat: values.lat ?? null,
      lng: values.lng ?? null,
      stayMinutes: values.stayMinutes ?? null,
    };
    const ok = editing ? await updateNode(editing.id, payload) : await createNode(payload);
    if (ok) {
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
    }
  };

  const columns = [
    {
      title: "景点名称",
      dataIndex: "name",
      key: "name",
      render: (v: string, row: TravelNode) => (
        <span className="font-medium text-slate-900">
          {v}
          {row.type ? <span className="ml-2 text-xs text-slate-400">{row.type}</span> : null}
        </span>
      ),
    },
    {
      title: "所属区域",
      dataIndex: "region",
      key: "region",
      width: 110,
      render: (v?: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "纬度",
      dataIndex: "lat",
      key: "lat",
      width: 110,
      render: (v: number | null) => (v === null || v === undefined ? <Text type="secondary">—</Text> : v.toFixed(5)),
    },
    {
      title: "经度",
      dataIndex: "lng",
      key: "lng",
      width: 110,
      render: (v: number | null) => (v === null || v === undefined ? <Text type="secondary">—</Text> : v.toFixed(5)),
    },
    {
      title: "开放时间",
      dataIndex: "openTime",
      key: "openTime",
      width: 130,
      render: (v?: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "推荐停留",
      dataIndex: "stayMinutes",
      key: "stayMinutes",
      width: 110,
      render: (v?: number | null) => (v ? `${v} 分钟` : <Text type="secondary">—</Text>),
    },
    {
      title: "路径计算",
      key: "routable",
      width: 110,
      render: (_: unknown, row: TravelNode) =>
        hasCoords(row) ? <Tag color="green">可参与</Tag> : <Tag color="orange">缺坐标</Tag>,
    },
    {
      title: "操作",
      key: "actions",
      width: 90,
      render: (_: unknown, row: TravelNode) => (
        <Button size="small" type="text" icon={<Pencil className="h-4 w-4" />} onClick={() => openEdit(row)}>
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen w-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button type="text" icon={<ArrowLeft className="h-4 w-4" />} />
              </Link>
              <div className="text-lg font-semibold text-slate-900">景点节点管理</div>
            </div>
            <div className="mt-1 text-sm text-slate-500">维护景点名称、经纬度、所属区域、开放时间与推荐停留时长</div>
          </div>
          <Button type="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            新增景点
          </Button>
        </div>

        <Alert
          className="mt-4"
          type={missingCount > 0 ? "warning" : "info"}
          showIcon
          icon={<MapPin className="h-4 w-4" />}
          message={
            missingCount > 0
              ? `有 ${missingCount} 个景点缺少坐标，暂不参与路径计算；可点击“编辑”补录经纬度。`
              : "坐标缺失的景点不会参与路径计算；所有景点坐标均已完善。"
          }
        />

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          {nodesLoading && nodes.length === 0 ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : (
            <Table<TravelNode>
              rowKey="id"
              size="middle"
              columns={columns}
              dataSource={nodes}
              loading={nodesLoading}
              pagination={{ pageSize: 10, showSizeChanger: false }}
            />
          )}
        </div>
      </div>

      <Modal
        title={editing ? `编辑景点：${editing.name}` : "新增景点"}
        open={modalOpen}
        onOk={() => void submit()}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        confirmLoading={savingNode}
        okText="保存"
        cancelText="取消"
        destroyOnClose={false}
      >
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item name="name" label="景点名称" rules={[{ required: true, whitespace: true, message: "请输入景点名称" }]}>
            <Input placeholder="如：洪崖洞" maxLength={64} />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="region" label="所属区域">
              <Input placeholder="如：渝中区" maxLength={32} />
            </Form.Item>
            <Form.Item name="openTime" label="开放时间">
              <Input placeholder="如：08:00-18:00 / 全天" maxLength={64} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="lat"
              label="纬度"
              dependencies={["lng"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, value) => {
                    const other = getFieldValue("lng");
                    if ((value === null || value === undefined) !== (other === null || other === undefined)) {
                      return Promise.reject(new Error("经纬度需同时填写或同时留空"));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <InputNumber className="w-full" placeholder="如：29.56301" min={-90} max={90} step={0.00001} precision={6} />
            </Form.Item>
            <Form.Item
              name="lng"
              label="经度"
              dependencies={["lat"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, value) => {
                    const other = getFieldValue("lat");
                    if ((value === null || value === undefined) !== (other === null || other === undefined)) {
                      return Promise.reject(new Error("经纬度需同时填写或同时留空"));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <InputNumber className="w-full" placeholder="如：106.57577" min={-180} max={180} step={0.00001} precision={6} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="stayMinutes" label="推荐停留时长（分钟）" rules={[{ type: "integer", min: 1, message: "需为正整数" }]}>
              <InputNumber className="w-full" placeholder="如：90" min={1} step={10} precision={0} />
            </Form.Item>
            <Form.Item name="type" label="类型">
              <Input placeholder="如：景区 / 博物馆" maxLength={32} />
            </Form.Item>
          </div>

          <Form.Item name="desc" label="描述">
            <Input.TextArea rows={2} placeholder="一句话介绍（可选）" maxLength={500} />
          </Form.Item>

          <div className="text-xs text-slate-500">经纬度可暂时留空；缺失坐标的景点不会出现在起终点候选中，也不参与路径计算。</div>
        </Form>
      </Modal>
    </div>
  );
}
