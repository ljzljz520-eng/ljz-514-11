package com.cqu.handler;

import com.cqu.model.Node;
import com.cqu.model.PathResult;
import com.cqu.service.GraphManager;
import com.cqu.service.NodeRepository;
import com.cqu.service.NodeValidator;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public class RequestHandler {
    private static final String ADMIN_NODES_PREFIX = "/api/admin/nodes";

    private final GraphManager graphManager;
    private final NodeRepository repo;
    private final ObjectMapper mapper;

    public RequestHandler(GraphManager graphManager, NodeRepository repo) {
        this.graphManager = graphManager;
        this.repo = repo;
        this.mapper = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
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
        writeJson(exchange, 200, listAllNodes());
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
            PathResult result = graphManager.get().shortestPath(from, to);
            writeJson(exchange, 200, result);
        } catch (IllegalArgumentException e) {
            writeJson(exchange, 400, Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            writeJson(exchange, 404, Map.of("error", e.getMessage()));
        } catch (Exception e) {
            writeJson(exchange, 500, Map.of("error", "服务器内部错误"));
        }
    }

    /**
     * 后台景点节点维护：
     * - GET    /api/admin/nodes          全部节点（含坐标缺失节点）
     * - POST   /api/admin/nodes          新增景点
     * - PUT    /api/admin/nodes/{id}     更新景点
     * - DELETE /api/admin/nodes/{id}     删除景点
     */
    public void handleAdminNodes(HttpExchange exchange) throws IOException {
        if (isPreflight(exchange)) {
            respondNoContent(exchange);
            return;
        }
        String method = exchange.getRequestMethod().toUpperCase();
        try {
            switch (method) {
                case "GET":
                    writeJson(exchange, 200, listAllNodes());
                    break;
                case "POST":
                    handleAdminCreate(exchange);
                    break;
                case "PUT":
                    handleAdminUpdate(exchange);
                    break;
                case "DELETE":
                    handleAdminDelete(exchange);
                    break;
                default:
                    writeJson(exchange, 405, Map.of("error", "不支持的请求方法"));
            }
        } catch (IllegalArgumentException e) {
            writeJson(exchange, 400, Map.of("error", e.getMessage()));
        } catch (Exception e) {
            writeJson(exchange, 500, Map.of("error", "服务器内部错误"));
        }
    }

    private void handleAdminCreate(HttpExchange exchange) throws IOException {
        String id = pathId(exchange);
        if (id != null) {
            writeJson(exchange, 400, Map.of("error", "新增景点请勿在路径中携带 ID"));
            return;
        }

        Node body = readBody(exchange);
        if (body == null) {
            writeJson(exchange, 400, Map.of("error", "请求体不是合法的 JSON"));
            return;
        }
        sanitize(body);

        List<String> errors = NodeValidator.validate(body);
        if (!errors.isEmpty()) {
            writeJson(exchange, 400, Map.of("error", String.join("；", errors)));
            return;
        }

        String newId = body.getId();
        if (newId == null || newId.isBlank()) {
            newId = generateId();
        } else if (repo.findById(newId).isPresent()) {
            writeJson(exchange, 409, Map.of("error", "ID 已存在：" + newId));
            return;
        }
        body.setId(newId);

        Node saved = repo.save(body);
        graphManager.refresh();
        writeJson(exchange, 201, saved);
    }

    private void handleAdminUpdate(HttpExchange exchange) throws IOException {
        String id = pathId(exchange);
        if (id == null) {
            writeJson(exchange, 400, Map.of("error", "缺少路径参数：景点 ID"));
            return;
        }

        Optional<Node> existingOpt = repo.findById(id);
        if (existingOpt.isEmpty()) {
            writeJson(exchange, 404, Map.of("error", "景点不存在：" + id));
            return;
        }

        Node body = readBody(exchange);
        if (body == null) {
            writeJson(exchange, 400, Map.of("error", "请求体不是合法的 JSON"));
            return;
        }
        sanitize(body);

        List<String> errors = NodeValidator.validate(body);
        if (!errors.isEmpty()) {
            writeJson(exchange, 400, Map.of("error", String.join("；", errors)));
            return;
        }

        Node existing = existingOpt.get();
        existing.setName(body.getName());
        existing.setLat(body.getLat());
        existing.setLng(body.getLng());
        existing.setType(body.getType());
        existing.setDesc(body.getDesc());
        existing.setRegion(body.getRegion());
        existing.setOpenHours(body.getOpenHours());
        existing.setStayMinutes(body.getStayMinutes());

        Node saved = repo.save(existing);
        graphManager.refresh();
        writeJson(exchange, 200, saved);
    }

    private void handleAdminDelete(HttpExchange exchange) throws IOException {
        String id = pathId(exchange);
        if (id == null) {
            writeJson(exchange, 400, Map.of("error", "缺少路径参数：景点 ID"));
            return;
        }
        boolean removed = repo.deleteById(id);
        if (!removed) {
            writeJson(exchange, 404, Map.of("error", "景点不存在：" + id));
            return;
        }
        graphManager.refresh();
        writeJson(exchange, 200, Map.of("ok", true, "id", id));
    }

    private List<Node> listAllNodes() {
        return repo.findAll().stream()
                .sorted(Comparator.comparing(Node::getName, Comparator.nullsLast(String::compareTo)))
                .toList();
    }

    /**
     * 从 /api/admin/nodes/{id} 中提取 id；无 id 时返回 null。
     */
    private static String pathId(HttpExchange exchange) {
        String path = exchange.getRequestURI().getPath();
        if (path == null || path.length() <= ADMIN_NODES_PREFIX.length()) {
            return null;
        }
        String rest = path.substring(ADMIN_NODES_PREFIX.length());
        if (!rest.startsWith("/")) {
            return null;
        }
        String id = URLDecoder.decode(rest.substring(1), StandardCharsets.UTF_8).trim();
        if (id.isEmpty() || id.contains("/")) {
            throw new IllegalArgumentException("非法的景点 ID 路径");
        }
        return id;
    }

    private Node readBody(HttpExchange exchange) {
        try {
            return mapper.readValue(exchange.getRequestBody(), Node.class);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 统一 trim 字符串字段；空串转 null（坐标除外，由校验规则处理）。
     */
    private static void sanitize(Node n) {
        n.setId(trimToNull(n.getId()));
        n.setName(trimToNull(n.getName()));
        n.setType(trimToNull(n.getType()));
        n.setDesc(trimToNull(n.getDesc()));
        n.setRegion(trimToNull(n.getRegion()));
        n.setOpenHours(trimToNull(n.getOpenHours()));
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private String generateId() {
        for (int i = 0; i < 8; i++) {
            String candidate = "N" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
            if (repo.findById(candidate).isEmpty()) {
                return candidate;
            }
        }
        return "N" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
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
