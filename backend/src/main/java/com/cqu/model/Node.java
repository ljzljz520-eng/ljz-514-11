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

    @Column(name = "lat")
    private Double lat;

    @Column(name = "lng")
    private Double lng;

    @Column(name = "node_type")
    private String type;

    @Column(name = "region")
    private String region;

    @Column(name = "open_time")
    private String openTime;

    @Column(name = "stay_minutes")
    private Integer stayMinutes;

    @Column(name = "description", length = 2000)
    private String desc;

    public Node() {
    }

    public Node(String id, String name, Double lat, Double lng, String type, String desc) {
        this.id = id;
        this.name = name;
        this.lat = lat;
        this.lng = lng;
        this.type = type;
        this.desc = desc;
    }

    public Node(String id, String name, Double lat, Double lng, String type, String region,
                String openTime, Integer stayMinutes, String desc) {
        this.id = id;
        this.name = name;
        this.lat = lat;
        this.lng = lng;
        this.type = type;
        this.region = region;
        this.openTime = openTime;
        this.stayMinutes = stayMinutes;
        this.desc = desc;
    }

    /**
     * 坐标是否完整有效；缺失坐标的景点不参与路径计算。
     */
    public boolean hasValidCoordinates() {
        return lat != null && lng != null
                && !Double.isNaN(lat) && !Double.isNaN(lng)
                && !Double.isInfinite(lat) && !Double.isInfinite(lng);
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

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public String getOpenTime() {
        return openTime;
    }

    public void setOpenTime(String openTime) {
        this.openTime = openTime;
    }

    public Integer getStayMinutes() {
        return stayMinutes;
    }

    public void setStayMinutes(Integer stayMinutes) {
        this.stayMinutes = stayMinutes;
    }

    public String getDesc() {
        return desc;
    }

    public void setDesc(String desc) {
        this.desc = desc;
    }
}
