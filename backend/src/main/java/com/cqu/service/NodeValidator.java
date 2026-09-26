package com.cqu.service;

import com.cqu.model.Node;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * 景点节点（新增/更新）入参校验。校验失败时返回中文错误信息列表。
 */
public final class NodeValidator {
    private static final Pattern ID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{1,64}$");
    private static final int MAX_NAME_LENGTH = 100;
    private static final int MAX_TEXT_LENGTH = 200;
    private static final int MAX_DESC_LENGTH = 2000;
    private static final int MAX_STAY_MINUTES = 24 * 60;

    private NodeValidator() {
    }

    /**
     * @return 错误信息列表；为空表示校验通过
     */
    public static List<String> validate(Node n) {
        List<String> errors = new ArrayList<>();
        if (n == null) {
            errors.add("请求体不能为空");
            return errors;
        }

        if (isBlank(n.getName())) {
            errors.add("景点名称不能为空");
        } else if (n.getName().trim().length() > MAX_NAME_LENGTH) {
            errors.add("景点名称长度不能超过 " + MAX_NAME_LENGTH + " 字");
        }

        if (!isBlank(n.getId()) && !ID_PATTERN.matcher(n.getId().trim()).matches()) {
            errors.add("ID 仅支持字母、数字、下划线、中划线，且不超过 64 位");
        }

        // 经纬度：要么都填，要么都不填；坐标缺失的景点不参与路径计算
        boolean hasLat = n.getLat() != null;
        boolean hasLng = n.getLng() != null;
        if (hasLat != hasLng) {
            errors.add("经纬度需同时填写或同时留空");
        }
        if (hasLat && (n.getLat() < -90 || n.getLat() > 90)) {
            errors.add("纬度需在 -90 到 90 之间");
        }
        if (hasLng && (n.getLng() < -180 || n.getLng() > 180)) {
            errors.add("经度需在 -180 到 180 之间");
        }

        if (n.getStayMinutes() != null && (n.getStayMinutes() < 0 || n.getStayMinutes() > MAX_STAY_MINUTES)) {
            errors.add("推荐停留时长需在 0 到 " + MAX_STAY_MINUTES + " 分钟之间");
        }

        if (lengthOf(n.getRegion()) > MAX_TEXT_LENGTH) {
            errors.add("所属区域长度不能超过 " + MAX_TEXT_LENGTH + " 字");
        }
        if (lengthOf(n.getOpenHours()) > MAX_TEXT_LENGTH) {
            errors.add("开放时间长度不能超过 " + MAX_TEXT_LENGTH + " 字");
        }
        if (lengthOf(n.getType()) > MAX_TEXT_LENGTH) {
            errors.add("类型长度不能超过 " + MAX_TEXT_LENGTH + " 字");
        }
        if (lengthOf(n.getDesc()) > MAX_DESC_LENGTH) {
            errors.add("描述长度不能超过 " + MAX_DESC_LENGTH + " 字");
        }

        return errors;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static int lengthOf(String s) {
        return s == null ? 0 : s.trim().length();
    }
}
