package com.cqu.handler;

import com.cqu.model.Node;
import com.cqu.model.NodeRequest;
import com.cqu.model.PathResult;
import com.cqu.service.GraphService;
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
    private final ObjectMapper mapper;

    public RequestHandler(GraphService graphService) {
        this.graphService = graphService;
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
        try {
            String method = exchange.getRequestMethod().toUpperCase();
            String path = exchange.getRequestURI().getPath();
            switch (method) {
                case "GET":
                    if (PATH_NODES.equals(path)) {
                        writeJson(exchange, 200, graphService.listNodes());
                    } else {
                        writeJson(exchange, 404, Map.of("error", "接口不存在"));
                    }
                    break;
                case "POST": {
                    if (!PATH_NODES.equals(path)) {
                        writeJson(exchange, 404, Map.of("error", "接口不存在"));
                        return;
                    }
                    NodeRequest req = readBody(exchange);
                    validateForCreate(req);
                    Node created = graphService.createNode(req);
                    writeJson(exchange, 201, created);
                    break;
                }
                case "PUT": {
                    String id = extractId(path);
                    if (id == null) {
                        writeJson(exchange, 404, Map.of("error", "接口不存在"));
                        return;
                    }
                    NodeRequest req = readBody(exchange);
                    validateForUpdate(req);
                    Node updated = graphService.updateNode(id, req);
                    if (updated == null) {
                        writeJson(exchange, 404, Map.of("error", "景点不存在：" + id));
                    } else {
                        writeJson(exchange, 200, updated);
                    }
                    break;
                }
                case "DELETE": {
                    String id = extractId(path);
                    if (id == null) {
                        writeJson(exchange, 404, Map.of("error", "接口不存在"));
                        return;
                    }
                    boolean removed = graphService.deleteNode(id);
                    if (!removed) {
                        writeJson(exchange, 404, Map.of("error", "景点不存在：" + id));
                    } else {
                        writeJson(exchange, 200, Map.of("id", id, "deleted", true));
                    }
                    break;
                }
                default:
                    writeJson(exchange, 405, Map.of("error", "不支持的请求方法：" + method));
            }
        } catch (IllegalArgumentException e) {
            writeJson(exchange, 400, Map.of("error", e.getMessage()));
        } catch (Exception e) {
            writeJson(exchange, 500, Map.of("error", "服务器内部错误"));
        }
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

    private static final String PATH_NODES = "/api/nodes";

    /** /api/nodes/{id} -> id；其余路径返回 null */
    private static String extractId(String path) {
        String prefix = PATH_NODES + "/";
        if (!path.startsWith(prefix)) {
            return null;
        }
        String rest = path.substring(prefix.length());
        if (rest.isEmpty() || rest.contains("/")) {
            return null;
        }
        return URLDecoder.decode(rest, StandardCharsets.UTF_8);
    }

    private NodeRequest readBody(HttpExchange exchange) throws IOException {
        byte[] raw = exchange.getRequestBody().readAllBytes();
        if (raw.length == 0) {
            throw new IllegalArgumentException("请求体为空");
        }
        NodeRequest req;
        try {
            req = mapper.readValue(raw, NodeRequest.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("请求体不是合法的 JSON");
        }
        return req;
    }

    private static void validateForCreate(NodeRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("请求体为空");
        }
        if (req.getName() == null || req.getName().isBlank()) {
            throw new IllegalArgumentException("景点名称不能为空");
        }
        if (req.getId() != null && !req.getId().isBlank() && req.getId().trim().length() > 64) {
            throw new IllegalArgumentException("景点 ID 长度不能超过 64");
        }
        validateCoordinates(req);
        validateStayMinutes(req);
    }

    private static void validateForUpdate(NodeRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("请求体为空");
        }
        if (req.getName() != null && req.getName().isBlank()) {
            throw new IllegalArgumentException("景点名称不能为空");
        }
        validateCoordinates(req);
        validateStayMinutes(req);
    }

    private static void validateCoordinates(NodeRequest req) {
        // lat/lng 允许同时为空（坐标缺失，不参与路径计算），但只填一个或越界均视为非法
        Double lat = req.getLat();
        Double lng = req.getLng();
        if (lat == null && lng == null) {
            return;
        }
        if (lat == null || lng == null) {
            throw new IllegalArgumentException("经纬度必须同时填写，或同时留空");
        }
        if (lat < -90 || lat > 90) {
            throw new IllegalArgumentException("纬度必须在 -90 ~ 90 之间");
        }
        if (lng < -180 || lng > 180) {
            throw new IllegalArgumentException("经度必须在 -180 ~ 180 之间");
        }
    }

    private static void validateStayMinutes(NodeRequest req) {
        Integer stay = req.getRecommendedStayMinutes();
        if (stay != null && stay <= 0) {
            throw new IllegalArgumentException("推荐停留时长必须大于 0 分钟");
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
