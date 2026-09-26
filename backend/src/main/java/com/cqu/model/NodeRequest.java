package com.cqu.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * 后台新增/编辑景点节点时提交的请求体。
 * 坐标（lat/lng）允许为空，表示坐标缺失、暂不参与路径计算。
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class NodeRequest {
    private String id;
    private String name;
    private Double lat;
    private Double lng;
    private String type;
    private String desc;
    private String region;
    private String openingHours;
    private Integer recommendedStayMinutes;

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
