# 重庆旅游线路规划系统

## 🛠 技术栈
- 前端：React + TypeScript + Tailwind + Ant Design + React-Leaflet（Vite）
- 后端：Java 17 + Maven + 内置 HTTP Server + Hibernate ORM
- 数据库：PostgreSQL 15

## 📦 数据文件
- `backend/src/main/resources/nodes.csv`：景点节点（首启数据库为空时导入；运行期以数据库为准，可在后台在线维护）
- `backend/src/main/resources/edges.csv`：边数据（可选，存在则优先使用；否则按地理距离自动生成边）

`nodes.csv` 必需列为 `id,name`；`lat,lng` 可同时缺省（坐标缺失的景点可维护、可展示，但**不参与路径计算**）。可选列：`type`、`desc`、`region`、`opening_hours`、`recommended_stay_minutes`。

`edges.csv` 格式：至少包含表头 `from,to`；可选第三列 `distance_meters`（若缺省则按两点经纬度计算球面距离）。

## 🧩 景点节点维护
- 前端左侧“景点节点维护”可新增/编辑/删除景点：名称、经纬度、所属区域、开放时间、推荐停留时长
- 接口：`POST /api/nodes`、`PUT /api/nodes/{id}`、`DELETE /api/nodes/{id}`；写操作后自动重建路径图
- 起终点下拉与地图 Marker 仅包含坐标完整的景点

文档索引：见 [docs/README.md](./docs/README.md)。

## 🚀 启动指南
1. 确保 Docker Desktop 已启动
2. 在根目录执行：`docker compose up -d --build`
3. 等待容器启动完成后访问前端与后端接口

## 🔗 服务地址
- 前端：http://localhost:3514
- 后端健康检查：http://localhost:8514/api/health
- 节点列表：http://localhost:8514/api/nodes
- 数据库：localhost:5514（db: cq_travel / user: cq / pass: cq）

## 🧪 测试账号
- 无（本项目无登录鉴权）

---

## 🐳 Docker 镜像源配置

### 推荐配置（基于实际项目验证）

#### 1. Docker 镜像源
当前 `Dockerfile` 使用 `docker.m.daocloud.io` 作为镜像前缀以加速国内拉取（也可替换为官方 Docker Hub 镜像）。

#### 2. npm 依赖源
在 `frontend/Dockerfile` 中使用：`npm config set registry https://registry.npmmirror.com`

#### 3. Maven 依赖源
在 `backend` 目录下提供 `settings.xml` 并在 `backend/Dockerfile` 中使用该镜像配置。
