import { Form, Input, InputNumber, Modal } from "antd";
import { useEffect } from "react";
import type { NodePayload, TravelNode } from "@/stores/useTravelStore";

type Props = {
  open: boolean;
  /** 传入节点表示编辑；null 表示新增 */
  node: TravelNode | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: NodePayload) => void;
};

type FormValues = {
  name: string;
  lat?: number | null;
  lng?: number | null;
  region?: string;
  openingHours?: string;
  recommendedStayMinutes?: number | null;
  type?: string;
  desc?: string;
};

export default function NodeFormModal({ open, node, submitting, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<FormValues>();
  const isEdit = !!node;

  useEffect(() => {
    if (!open) return;
    if (node) {
      form.setFieldsValue({
        name: node.name,
        lat: node.lat,
        lng: node.lng,
        region: node.region,
        openingHours: node.openingHours,
        recommendedStayMinutes: node.recommendedStayMinutes ?? null,
        type: node.type,
        desc: node.desc,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ lat: null, lng: null, recommendedStayMinutes: null });
    }
  }, [open, node, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const lat = values.lat ?? null;
    const lng = values.lng ?? null;
    const trim = (v?: string) => {
      const t = (v ?? "").trim();
      return t || null;
    };
    onSubmit({
      id: node?.id,
      name: values.name.trim(),
      lat,
      lng,
      region: trim(values.region),
      openingHours: trim(values.openingHours),
      recommendedStayMinutes: values.recommendedStayMinutes ?? null,
      type: trim(values.type),
      desc: trim(values.desc),
    });
  };

  return (
    <Modal
      open={open}
      title={isEdit ? `编辑景点：${node?.name}` : "新增景点"}
      okText={isEdit ? "保存" : "新增"}
      cancelText="取消"
      confirmLoading={submitting}
      onCancel={onCancel}
      onOk={handleOk}
      destroyOnClose
      maskClosable={false}
      width={560}
    >
      <Form form={form} layout="vertical" className="mt-2" requiredMark="optional">
        <Form.Item
          name="name"
          label="景点名称"
          rules={[{ required: true, whitespace: true, message: "请输入景点名称" }]}
        >
          <Input placeholder="如：洪崖洞" maxLength={100} allowClear />
        </Form.Item>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item
            name="lat"
            label="纬度"
            extra="留空表示坐标缺失"
            rules={[
              {
                validator: (_, value) => {
                  if (value === null || value === undefined || value === "") return Promise.resolve();
                  const v = Number(value);
                  return v >= -90 && v <= 90 ? Promise.resolve() : Promise.reject(new Error("纬度范围 -90 ~ 90"));
                },
              },
            ]}
          >
            <InputNumber<number> className="w-full" placeholder="如：29.56470" controls={false} precision={6} />
          </Form.Item>
          <Form.Item
            name="lng"
            label="经度"
            extra="不参与路径计算"
            rules={[
              {
                validator: (_, value) => {
                  if (value === null || value === undefined || value === "") return Promise.resolve();
                  const v = Number(value);
                  return v >= -180 && v <= 180 ? Promise.resolve() : Promise.reject(new Error("经度范围 -180 ~ 180"));
                },
              },
            ]}
          >
            <InputNumber<number> className="w-full" placeholder="如：106.58169" controls={false} precision={6} />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="region" label="所属区域">
            <Input placeholder="如：渝中区" maxLength={50} allowClear />
          </Form.Item>
          <Form.Item name="openingHours" label="开放时间">
            <Input placeholder="如：09:00-17:30" maxLength={100} allowClear />
          </Form.Item>
        </div>

        <Form.Item name="recommendedStayMinutes" label="推荐停留时长（分钟）">
          <InputNumber<number> className="w-full" min={1} step={15} placeholder="如：90" controls={false} precision={0} />
        </Form.Item>

        <Form.Item name="type" label="节点类型">
          <Input placeholder="如：景区 / 公园 / 博物馆" maxLength={50} allowClear />
        </Form.Item>

        <Form.Item name="desc" label="简介">
          <Input.TextArea rows={3} maxLength={2000} showCount placeholder="景点简介（可选）" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
