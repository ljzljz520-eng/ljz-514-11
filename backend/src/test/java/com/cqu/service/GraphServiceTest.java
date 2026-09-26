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
    void listNodesIncludesNodesWithoutCoordinates() {
        Map<String, Node> nodes = new HashMap<>();
        nodes.put("A", new Node("A", "甲", 29.56, 106.57, "t", "d"));
        nodes.put("X", new Node("X", "待定位景点", null, null, "t", "d", "渝中区", null, null));
        GraphService g = new GraphService(nodes);

        assertEquals(2, g.listNodes().size());
    }

    @Test
    void nodesWithoutCoordinatesCannotParticipateInPath() {
        Map<String, Node> nodes = new HashMap<>();
        nodes.put("A", new Node("A", "甲", 29.56301, 106.57577, "t", "d"));
        nodes.put("B", new Node("B", "乙", 29.56470, 106.58169, "t", "d"));
        nodes.put("X", new Node("X", "缺坐标景点", null, null, "t", "d", "渝中区", null, 60));
        GraphService g = new GraphService(nodes);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> g.shortestPath("A", "X"));
        assertTrue(ex.getMessage().contains("缺少坐标"));

        // 有坐标的节点之间仍可正常规划
        PathResult r = g.shortestPath("A", "B");
        assertNotNull(r);
        assertFalse(r.getPathNodes().isEmpty());
    }
}
