package com.cqu.service;

import com.cqu.model.Node;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class NodeValidatorTest {
    @Test
    void createRequiresName() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("lat", 29.5);
        payload.put("lng", 106.5);
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> NodeValidator.buildForCreate(payload));
        assertTrue(e.getMessage().contains("名称"));
    }

    @Test
    void createGeneratesIdWhenAbsent() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("name", "测试景点");
        Node node = NodeValidator.buildForCreate(payload);
        assertNotNull(node.getId());
        assertFalse(node.getId().isBlank());
        // 坐标可缺失：允许先建档后补录
        assertNull(node.getLat());
        assertNull(node.getLng());
    }

    @Test
    void latAndLngMustBeBothProvided() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("name", "测试景点");
        payload.put("lat", 29.5);
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> NodeValidator.buildForCreate(payload));
        assertTrue(e.getMessage().contains("经纬度"));
    }

    @Test
    void rejectsOutOfRangeCoordinates() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("name", "测试景点");
        payload.put("lat", 91.0);
        payload.put("lng", 106.5);
        assertThrows(IllegalArgumentException.class, () -> NodeValidator.buildForCreate(payload));

        Map<String, Object> payload2 = new HashMap<>();
        payload2.put("name", "测试景点");
        payload2.put("lat", 29.5);
        payload2.put("lng", 181.0);
        assertThrows(IllegalArgumentException.class, () -> NodeValidator.buildForCreate(payload2));
    }

    @Test
    void rejectsInvalidStayMinutes() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("name", "测试景点");
        payload.put("stayMinutes", -10);
        assertThrows(IllegalArgumentException.class, () -> NodeValidator.buildForCreate(payload));
    }

    @Test
    void buildsFullNode() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("name", "洪崖洞");
        payload.put("lat", 29.5647);
        payload.put("lng", 106.58169);
        payload.put("region", "渝中区");
        payload.put("openTime", "09:00-23:00");
        payload.put("stayMinutes", 120);
        Node node = NodeValidator.buildForCreate(payload);
        assertEquals("洪崖洞", node.getName());
        assertEquals(29.5647, node.getLat(), 1e-9);
        assertEquals("渝中区", node.getRegion());
        assertEquals("09:00-23:00", node.getOpenTime());
        assertEquals(120, node.getStayMinutes());
        assertTrue(node.hasValidCoordinates());
    }

    @Test
    void updateOnlyOverridesProvidedFields() {
        Node existing = new Node("X", "旧名称", 29.5, 106.5, "景区", "渝中区", "全天", 60, "旧描述");
        Map<String, Object> payload = new HashMap<>();
        payload.put("openTime", "08:00-18:00");
        NodeValidator.applyForUpdate(existing, payload);
        assertEquals("08:00-18:00", existing.getOpenTime());
        assertEquals("旧名称", existing.getName());
        assertEquals(29.5, existing.getLat(), 1e-9);

        // 坐标可清空（同时置空）
        Map<String, Object> clear = new HashMap<>();
        clear.put("lat", null);
        clear.put("lng", null);
        NodeValidator.applyForUpdate(existing, clear);
        assertNull(existing.getLat());
        assertNull(existing.getLng());
    }
}
