package com.cqu.service;

import com.cqu.model.Node;

import java.util.Map;
import java.util.UUID;

/**
 * 后台景点节点数据校验：将请求 JSON 转换为合法的 Node。
 * 校验失败抛出带中文信息的 IllegalArgumentException。
 */
public final class NodeValidator {
    private NodeValidator() {
    }

    /**
     * 新增：name 必填；id 缺省时自动生成。
     */
    public static Node buildForCreate(Map<String, Object> payload) {
        Node node = new Node();
        String id = stringValue(payload.get("id"));
        node.setId(id != null ? id : generateId());
        applyPayload(node, payload, true);
        return node;
    }

    /**
     * 更新：仅覆盖请求中出现的字段；name 若出现则不能为空。
     */
    public static void applyForUpdate(Node node, Map<String, Object> payload) {
        applyPayload(node, payload, false);
    }

    private static void applyPayload(Node node, Map<String, Object> payload, boolean create) {
        boolean nameProvided = payload.containsKey("name");
        String name = stringValue(payload.get("name"));
        if (create && name == null) {
            throw new IllegalArgumentException("景点名称不能为空");
        }
        if (nameProvided) {
            if (name == null) {
                throw new IllegalArgumentException("景点名称不能为空");
            }
            node.setName(name);
        }

        if (create || payload.containsKey("lat") || payload.containsKey("lng")) {
            Double lat = doubleValue(payload.get("lat"), "纬度");
            Double lng = doubleValue(payload.get("lng"), "经度");
            if ((lat == null) != (lng == null)) {
                throw new IllegalArgumentException("经纬度需同时填写或同时留空");
            }
            if (lat != null) {
                if (lat < -90 || lat > 90) {
                    throw new IllegalArgumentException("纬度需在 -90 到 90 之间");
                }
                if (lng < -180 || lng > 180) {
                    throw new IllegalArgumentException("经度需在 -180 到 180 之间");
                }
            }
            node.setLat(lat);
            node.setLng(lng);
        }

        if (create || payload.containsKey("region")) {
            node.setRegion(stringValue(payload.get("region")));
        }
        if (create || payload.containsKey("openTime")) {
            node.setOpenTime(stringValue(payload.get("openTime")));
        }
        if (create || payload.containsKey("type")) {
            node.setType(stringValue(payload.get("type")));
        }
        if (create || payload.containsKey("desc")) {
            node.setDesc(stringValue(payload.get("desc")));
        }
        if (create || payload.containsKey("stayMinutes")) {
            Integer stay = intValue(payload.get("stayMinutes"), "推荐停留时长");
            if (stay != null && stay <= 0) {
                throw new IllegalArgumentException("推荐停留时长需为正整数（分钟）");
            }
            node.setStayMinutes(stay);
        }
    }

    private static String generateId() {
        return "SPOT_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
    }

    private static String stringValue(Object raw) {
        if (raw == null) {
            return null;
        }
        String s = String.valueOf(raw).trim();
        return s.isEmpty() ? null : s;
    }

    private static Double doubleValue(Object raw, String label) {
        if (raw == null) {
            return null;
        }
        double v;
        if (raw instanceof Number) {
            v = ((Number) raw).doubleValue();
        } else {
            String s = String.valueOf(raw).trim();
            if (s.isEmpty()) {
                return null;
            }
            try {
                v = Double.parseDouble(s);
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException(label + "格式不正确");
            }
        }
        if (Double.isNaN(v) || Double.isInfinite(v)) {
            throw new IllegalArgumentException(label + "格式不正确");
        }
        return v;
    }

    private static Integer intValue(Object raw, String label) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof Number) {
            double d = ((Number) raw).doubleValue();
            if (d != Math.floor(d) || Double.isNaN(d) || Double.isInfinite(d)) {
                throw new IllegalArgumentException(label + "需为整数");
            }
            return (int) d;
        }
        String s = String.valueOf(raw).trim();
        if (s.isEmpty()) {
            return null;
        }
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(label + "需为整数");
        }
    }
}
