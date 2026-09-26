package com.cqu.service;

import com.cqu.model.Node;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class NodeValidatorTest {

    @Test
    void validNodePasses() {
        Node n = new Node("X1", "测试景点", 29.56301, 106.57577, "景区", "desc", "渝中区", "09:00-17:00", 90);
        assertTrue(NodeValidator.validate(n).isEmpty());
    }

    @Test
    void validNodeWithoutCoordinatesPasses() {
        // 坐标允许缺失（缺失后不参与路径计算）
        Node n = new Node("X2", "待补坐标景点", null, null, null, null, "渝中区", "全天开放", null);
        assertTrue(NodeValidator.validate(n).isEmpty());
    }

    @Test
    void nameIsRequired() {
        Node n = new Node("X3", "  ", 29.0, 106.0, null, null);
        List<String> errors = NodeValidator.validate(n);
        assertFalse(errors.isEmpty());
        assertTrue(errors.stream().anyMatch(e -> e.contains("名称")));
    }

    @Test
    void latLngMustBeBothOrNeither() {
        Node onlyLat = new Node("X4", "景点", 29.0, null, null, null);
        Node onlyLng = new Node("X5", "景点", null, 106.0, null, null);
        assertFalse(NodeValidator.validate(onlyLat).isEmpty());
        assertFalse(NodeValidator.validate(onlyLng).isEmpty());
    }

    @Test
    void coordinateRangeIsChecked() {
        Node badLat = new Node("X6", "景点", 91.0, 106.0, null, null);
        Node badLng = new Node("X7", "景点", 29.0, 181.0, null, null);
        assertFalse(NodeValidator.validate(badLat).isEmpty());
        assertFalse(NodeValidator.validate(badLng).isEmpty());
    }

    @Test
    void stayMinutesMustBeNonNegative() {
        Node n = new Node("X8", "景点", 29.0, 106.0, null, null, null, null, -5);
        assertFalse(NodeValidator.validate(n).isEmpty());
    }

    @Test
    void invalidIdIsRejected() {
        Node n = new Node("含 空格", "景点", 29.0, 106.0, null, null);
        assertFalse(NodeValidator.validate(n).isEmpty());
    }
}
