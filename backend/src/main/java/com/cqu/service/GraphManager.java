package com.cqu.service;

import com.cqu.model.Edge;

import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * 持有当前生效的 GraphService。景点节点发生增删改后，
 * 通过 {@link #refresh()} 从数据库重新加载节点并重建图，
 * 保证路径计算始终基于最新数据。
 */
public class GraphManager {
    private static final Logger logger = Logger.getLogger(GraphManager.class.getName());

    private final NodeRepository repo;
    private final List<Edge> edges;
    private volatile GraphService graphService;

    public GraphManager(NodeRepository repo, List<Edge> edges) {
        this.repo = repo;
        this.edges = edges == null ? List.of() : List.copyOf(edges);
        refresh();
    }

    public GraphService get() {
        return graphService;
    }

    public synchronized void refresh() {
        this.graphService = new GraphService(repo.findAllAsMap(), edges);
        logger.log(Level.INFO, "Graph rebuilt from database nodes");
    }
}
