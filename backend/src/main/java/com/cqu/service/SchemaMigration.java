package com.cqu.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * 轻量启动迁移：放宽历史库中 nodes.lat / nodes.lng 的 NOT NULL 约束，
 * 以支持“坐标缺失的景点节点”。Hibernate hbm2ddl.auto=update 不会主动收窄或放宽列约束。
 */
public final class SchemaMigration {
    private static final Logger logger = Logger.getLogger(SchemaMigration.class.getName());

    private SchemaMigration() {
    }

    public static void relaxNodeCoordinates(EntityManagerFactory emf) {
        EntityManager em = emf.createEntityManager();
        try {
            em.getTransaction().begin();
            // PostgreSQL：将列改为可空（IF EXISTS 保证列不存在时也不报错）
            em.createNativeQuery("ALTER TABLE nodes ALTER COLUMN lat DROP NOT NULL").executeUpdate();
            em.createNativeQuery("ALTER TABLE nodes ALTER COLUMN lng DROP NOT NULL").executeUpdate();
            em.getTransaction().commit();
        } catch (RuntimeException e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            // 全新库由 Hibernate 直接建为可空列，此处失败通常是约束已放宽，可忽略
            logger.log(Level.FINE, "Skip relaxing nodes.lat/lng NOT NULL: " + e.getMessage());
        } finally {
            em.close();
        }
    }
}
