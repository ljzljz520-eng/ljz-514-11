package com.cqu.service;

import com.cqu.model.Edge;
import com.cqu.model.Node;
import com.cqu.model.PathResult;
import org.junit.jupiter.api.Test;

import java.util.List;
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
                "A", new Node("A", "A", 29.56301, 106.57577, "t", "d"),
                "B", new Node("B", "B", 29.56470, 106.58169, "t", "d"),
                "NO_GEO", new Node("NO_GEO", "缺坐标景点", null, null, "t", "d")
        );
        GraphService g = new GraphService(nodes);

        // 坐标缺失的景点不能参与路径计算
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> g.shortestPath("A", "NO_GEO"));
        assertTrue(ex.getMessage().contains("坐标"));

        IllegalArgumentException ex2 = assertThrows(IllegalArgumentException.class,
                () -> g.shortestPath("NO_GEO", "B"));
        assertTrue(ex2.getMessage().contains("坐标"));

        // 坐标齐全的节点之间不受影响
        PathResult r = g.shortestPath("A", "B");
        assertNotNull(r);
        assertFalse(r.getPathNodeIds().contains("NO_GEO"));
    }

    @Test
    void coordinateLessNodeIsIgnoredWhenBuildingGraphFromEdges() {
        Map<String, Node> nodes = Map.of(
                "A", new Node("A", "A", 29.56301, 106.57577, "t", "d"),
                "B", new Node("B", "B", 29.56470, 106.58169, "t", "d"),
                "NO_GEO", new Node("NO_GEO", "缺坐标景点", null, null, "t", "d")
        );
        List<Edge> edges = List.of(
                new Edge("A", "B", 1000.0),
                new Edge("A", "NO_GEO", 10.0),
                new Edge("NO_GEO", "B", 10.0)
        );
        GraphService g = new GraphService(nodes, edges);
        PathResult r = g.shortestPath("A", "B");
        assertNotNull(r);
        // 缺坐标节点即使出现在 edges.csv 中也不会进入路径
        assertFalse(r.getPathNodeIds().contains("NO_GEO"));
        assertEquals(1000.0, r.getTotalDistanceMeters(), 0.0001);
    }

    @Test
    void unknownNodeStillRejected() {
        Map<String, Node> nodes = Map.of(
                "A", new Node("A", "A", 29.56301, 106.57577, "t", "d")
        );
        GraphService g = new GraphService(nodes);
        assertThrows(IllegalArgumentException.class, () -> g.shortestPath("A", "MISSING"));
    }
}
