package com.cqu.service;

import com.cqu.model.Node;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class NodeRepository {
    private final EntityManagerFactory emf;

    public NodeRepository(EntityManagerFactory emf) {
        this.emf = emf;
    }

    public boolean hasAnyNodes() {
        EntityManager em = emf.createEntityManager();
        try {
            Long count = em.createQuery("select count(n) from Node n", Long.class).getSingleResult();
            return count != null && count > 0;
        } finally {
            em.close();
        }
    }

    public void saveAll(List<Node> nodes) {
        EntityManager em = emf.createEntityManager();
        try {
            em.getTransaction().begin();
            for (Node n : nodes) {
                em.merge(n);
            }
            em.getTransaction().commit();
        } catch (RuntimeException e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        } finally {
            em.close();
        }
    }

    public Node save(Node node) {
        EntityManager em = emf.createEntityManager();
        try {
            em.getTransaction().begin();
            Node merged = em.merge(node);
            em.getTransaction().commit();
            // 在事务/会话外访问字段前先强制加载并返回游离对象
            em.detach(merged);
            return merged;
        } catch (RuntimeException e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        } finally {
            em.close();
        }
    }

    public Node findById(String id) {
        EntityManager em = emf.createEntityManager();
        try {
            Node node = em.find(Node.class, id);
            if (node != null) {
                em.detach(node);
            }
            return node;
        } finally {
            em.close();
        }
    }

    public boolean existsById(String id) {
        return findById(id) != null;
    }

    public boolean deleteById(String id) {
        EntityManager em = emf.createEntityManager();
        try {
            em.getTransaction().begin();
            Node node = em.find(Node.class, id);
            if (node == null) {
                em.getTransaction().rollback();
                return false;
            }
            em.remove(node);
            em.getTransaction().commit();
            return true;
        } catch (RuntimeException e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        } finally {
            em.close();
        }
    }

    public List<Node> findAll() {
        EntityManager em = emf.createEntityManager();
        try {
            List<Node> list = em.createQuery("select n from Node n", Node.class).getResultList();
            // 游离化，避免会话关闭后懒加载问题
            list.forEach(em::detach);
            return list;
        } finally {
            em.close();
        }
    }

    public Map<String, Node> findAllAsMap() {
        List<Node> nodes = findAll();
        Map<String, Node> map = new HashMap<>();
        for (Node n : nodes) {
            map.put(n.getId(), n);
        }
        return map;
    }
}
