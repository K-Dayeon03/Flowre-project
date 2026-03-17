package com.flowre.server.domain.document.repository;

import com.flowre.server.domain.document.entity.Document;
import com.flowre.server.domain.document.entity.DocumentCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByBrandIdOrderByCreatedAtDesc(Long brandId);

    List<Document> findByBrandIdAndCategoryOrderByCreatedAtDesc(Long brandId, DocumentCategory category);

    Optional<Document> findByIdAndBrandId(Long id, Long brandId);
}
