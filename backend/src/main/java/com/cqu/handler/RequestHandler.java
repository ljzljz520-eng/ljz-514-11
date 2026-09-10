package com.cqu.handler;

import com.cqu.model.Node;
import com.cqu.model.PathResult;
import com.cqu.service.GraphService;
import com.cqu.service.NodeRepository;
import com.cqu.service.NodeValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

public class RequestHandler {
    private final GraphService graphService;
    private final NodeRepository nodeRepository;
    private final ObjectMapper mapper;

    public RequestHandler(GraphService graphService) {
        this(graphService, null);
    }

    public RequestHandler(GraphService graphService, NodeRepository nodeRepository) {
        this.graphService = graphService;
        this.nodeRepository = nodeRepository;
        this.mapper = new ObjectMapper();
    }

    public void handleHealth(HttpExchange exchange) throws IOException {
        if (isPreflight(exchange)) {
            respondNoContent(exchange);
            return;
        }
        Map<String, Object> payload = new HashMap<>();
        payload.put("status", "ok");
        payload.put("time", Instant.now().toString());
        writeJson(exchange, 200, payload);
    }

    public void handleNodes(HttpExchange exchange) throws IOException {
        if (isPreflight(exchange)) {
            respondNoContent(exchange);
            return;
        }
        writeJson(exchange, 200, graphService.listNodes());
    }

    public void handlePath(HttpExchange exchange) throws IOException {
        if (isPreflight(exchange)) {
            respondNoContent(exchange);
            return;
        }
        try {
            Map<String, String> q = parseQuery(exchange.getRequestURI().getRawQuery());
            String from = q.get("from");
            String to = q.get("to");
            if (from == null || to == null || from.isBlank() || to.isBlank()) {
                writeJson(exchange, 400, Map.of("error", "缺少必填参数：from、to"));
                return;
            }
            PathResult result = graphService.shortestPath(from, to);
            writeJson(exchange, 200, result);
        } catch (IllegalArgumentException e) {
            writeJson(exchange, 400, Map.of("error", e.getMessage()));
        } catch (Exception e) {
            writeJson(exchange, 500, Map.of("error", "服务器内部错误"));
        }
    }

    /**
     * 后台景点维护：POST 新增、PUT 更新（query 参数 id 指定节点）。
     * 保存成功后重建图，使新节点立即参与（或退出）路径计算。
     */
    public void handleAdminNodes(HttpExchange exchange) throws IOException {
        if (isPreflight(exchange)) {
            respondNoContent(exchange);
            return;
        }
        if (nodeRepository == null) {
            writeJson(exchange, 503, Map.of("error", "节点存储不可用"));
            return;
        }
        String method = exchange.getRequestMethod().toUpperCase();
        try {
            if ("POST".equals(method)) {
                handleAdminCreate(exchange);
            } else if ("PUT".equals(method)) {
                handleAdminUpdate(exchange);
            } else {
                writeJson(exchange, 405, Map.of("error", "不支持的请求方法"));
            }
        } catch (IllegalArgumentException e) {
            writeJson(exchange, 400, Map.of("error", e.getMessage()));
        } catch (Exception e) {
            writeJson(exchange, 500, Map.of("error", "服务器内部错误"));
        }
    }

    private void handleAdminCreate(HttpExchange exchange) throws IOException {
        Map<String, Object> payload = readJsonBody(exchange);
        Node node = NodeValidator.buildForCreate(payload);
        if (nodeRepository.existsById(node.getId())) {
            throw new IllegalArgumentException("节点 ID 已存在：" + node.getId());
        }
        Node saved = nodeRepository.save(node);
        graphService.reload(nodeRepository.findAllAsMap());
        writeJson(exchange, 200, saved);
    }

    private void handleAdminUpdate(HttpExchange exchange) throws IOException {
        Map<String, String> q = parseQuery(exchange.getRequestURI().getRawQuery());
        String id = q.get("id");
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("缺少必填参数：id");
        }
        Node existing = nodeRepository.findById(id);
        if (existing == null) {
            throw new IllegalArgumentException("节点不存在：" + id);
        }
        Map<String, Object> payload = readJsonBody(exchange);
        NodeValidator.applyForUpdate(existing, payload);
        Node saved = nodeRepository.save(existing);
        graphService.reload(nodeRepository.findAllAsMap());
        writeJson(exchange, 200, saved);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readJsonBody(HttpExchange exchange) throws IOException {
        byte[] body = exchange.getRequestBody().readAllBytes();
        if (body.length == 0) {
            throw new IllegalArgumentException("请求体不能为空");
        }
        try {
            Object parsed = mapper.readValue(body, Map.class);
            return (Map<String, Object>) parsed;
        } catch (Exception e) {
            throw new IllegalArgumentException("请求体不是合法的 JSON");
        }
    }

    private void writeJson(HttpExchange exchange, int status, Object payload) throws IOException {
        byte[] bytes = mapper.writeValueAsBytes(payload);
        Headers h = exchange.getResponseHeaders();
        applyCors(exchange);
        h.set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static Map<String, String> parseQuery(String rawQuery) {
        Map<String, String> map = new HashMap<>();
        if (rawQuery == null || rawQuery.isBlank()) {
            return map;
        }
        String[] pairs = rawQuery.split("&");
        for (String p : pairs) {
            int idx = p.indexOf('=');
            if (idx <= 0) {
                continue;
            }
            String k = URLDecoder.decode(p.substring(0, idx), StandardCharsets.UTF_8);
            String v = URLDecoder.decode(p.substring(idx + 1), StandardCharsets.UTF_8);
            map.put(k, v);
        }
        return map;
    }

    private static boolean isPreflight(HttpExchange exchange) {
        return "OPTIONS".equalsIgnoreCase(exchange.getRequestMethod());
    }

    private static void respondNoContent(HttpExchange exchange) throws IOException {
        applyCors(exchange);
        exchange.sendResponseHeaders(204, -1);
        exchange.close();
    }

    private static void applyCors(HttpExchange exchange) {
        Headers h = exchange.getResponseHeaders();
        h.set("Access-Control-Allow-Origin", "*");
        h.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
        h.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
        h.set("Access-Control-Max-Age", "86400");
    }
}
