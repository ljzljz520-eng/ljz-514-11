package com.cqu.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "nodes")
public class Node {
    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "name", nullable = false)
    private String name;

    /** 纬度；坐标缺失时为 null，该节点不参与路径计算 */
    @Column(name = "lat")
    private Double lat;

    /** 经度；坐标缺失时为 null，该节点不参与路径计算 */
    @Column(name = "lng")
    private Double lng;

    @Column(name = "node_type")
    private String type;

    @Column(name = "description", length = 2000)
    private String desc;

    /** 所属区域，如：渝中区、沙坪坝区 */
    @Column(name = "region")
    private String region;

    /** 开放时间，自由文本，如：09:00-17:30 */
    @Column(name = "opening_hours")
    private String openingHours;

    /** 推荐停留时长（分钟） */
    @Column(name = "recommended_stay_minutes")
    private Integer recommendedStayMinutes;

    public Node() {
    }

    public Node(String id, String name, double lat, double lng, String type, String desc) {
        this(id, name, Double.valueOf(lat), Double.valueOf(lng), type, desc, null, null, null);
    }

    public Node(String id, String name, Double lat, Double lng, String type, String desc,
                String region, String openingHours, Integer recommendedStayMinutes) {
        this.id = id;
        this.name = name;
        this.lat = lat;
        this.lng = lng;
        this.type = type;
        this.desc = desc;
        this.region = region;
        this.openingHours = openingHours;
        this.recommendedStayMinutes = recommendedStayMinutes;
    }

    public boolean hasCoordinates() {
        return lat != null && lng != null;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Double getLat() {
        return lat;
    }

    public void setLat(Double lat) {
        this.lat = lat;
    }

    public Double getLng() {
        return lng;
    }

    public void setLng(Double lng) {
        this.lng = lng;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getDesc() {
        return desc;
    }

    public void setDesc(String desc) {
        this.desc = desc;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public String getOpeningHours() {
        return openingHours;
    }

    public void setOpeningHours(String openingHours) {
        this.openingHours = openingHours;
    }

    public Integer getRecommendedStayMinutes() {
        return recommendedStayMinutes;
    }

    public void setRecommendedStayMinutes(Integer recommendedStayMinutes) {
        this.recommendedStayMinutes = recommendedStayMinutes;
    }
}
