package com.cqu.service;

import com.cqu.model.Node;
import com.cqu.model.PathResult;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class GraphServiceTest {
    @Test
    void shortestPathReturnsValidResult() {
        Map<String, Node> nodes = Map.of(
                "A", new Node("A", "A", 29.56301, 106.57577, "t", "d"),
                "B", new Node("B", "B", 29.56470, 106.58169, "t", "d"),
                "C", new Node("C", "C", 29.56336, 106.58713, "t", "d")
        );
        GraphService g = new GraphService(nodes);
        PathResult r = g.shortestPath("A", "C");
        assertNotNull(r);
        assertEquals("A", r.getStartId());
        assertEquals("C", r.getEndId());
        assertFalse(r.getPathNodeIds().isEmpty());
        assertEquals(r.getPathNodeIds().size(), r.getPathNodes().size());
    }

    @Test
    void nodeWithoutCoordinatesCannotRoute() {
        Map<String, Node> nodes = Map.of(
                "A", new Node("A", "有坐标A", 29.56301, 106.57577, "t", "d"),
                "B", new Node("B", "有坐标B", 29.56470, 106.58169, "t", "d"),
                "C", new Node("C", "缺坐标C", null, null, "t", "d")
        );
        GraphService g = new GraphService(nodes);

        // 缺坐标节点仍在节点列表中（供后台维护）
        assertEquals(3, g.listNodes().size());

        // 缺坐标节点不能作为起点或终点参与路径计算
        IllegalArgumentException e1 = assertThrows(IllegalArgumentException.class, () -> g.shortestPath("A", "C"));
        assertTrue(e1.getMessage().contains("坐标"));
        IllegalArgumentException e2 = assertThrows(IllegalArgumentException.class, () -> g.shortestPath("C", "B"));
        assertTrue(e2.getMessage().contains("坐标"));

        // 有坐标节点之间不受影响
        PathResult r = g.shortestPath("A", "B");
        assertNotNull(r);
        assertEquals(2, r.getPathNodeIds().size());
    }

    @Test
    void reloadMakesNewlyAddedNodeRoutable() {
        Map<String, Node> initial = new HashMap<>();
        initial.put("A", new Node("A", "景点A", 29.56301, 106.57577, "t", "d"));
        initial.put("B", new Node("B", "景点B", 29.56470, 106.58169, "t", "d"));
        GraphService g = new GraphService(initial);
        assertEquals(2, g.listNodes().size());

        // 后台新增缺坐标景点：出现在列表中，但不可参与计算
        Map<String, Node> withNew = new HashMap<>(initial);
        withNew.put("C", new Node("C", "新景点C", null, null, "渝中区", null, null, null, "d"));
        g.reload(withNew);
        assertEquals(3, g.listNodes().size());
        assertThrows(IllegalArgumentException.class, () -> g.shortestPath("A", "C"));

        // 补录坐标后即可参与路径计算
        Map<String, Node> withCoords = new HashMap<>(withNew);
        withCoords.put("C", new Node("C", "新景点C", 29.56336, 106.58713, "渝中区", null, null, null, "d"));
        g.reload(withCoords);
        PathResult r = g.shortestPath("A", "C");
        assertNotNull(r);
        assertEquals("C", r.getEndId());
    }
}
