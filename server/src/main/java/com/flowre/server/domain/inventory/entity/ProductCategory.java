package com.flowre.server.domain.inventory.entity;

import org.springframework.util.StringUtils;

import java.util.List;

/**
 * 상품 카테고리. 점별재고현황 엑셀에는 카테고리 컬럼이 없으므로 상품명(productName)의
 * 키워드로 분류한다. {@link #classify(String)}는 enum 선언 순서(우선순위)대로 키워드를
 * 검사해 첫 번째로 매칭되는 카테고리를 반환하며, 어디에도 걸리지 않으면 {@link #ETC}.
 *
 * <p>선언 순서가 곧 우선순위다. 상품명에 여러 키워드가 섞일 수 있어(예: "데님 자켓"은
 * 데님(팬츠)·자켓(자켓) 모두 포함) 더 구체적인 분류를 앞에 둔다.
 * - 자켓을 팬츠보다 앞에 둬 "데님 자켓"이 자켓으로 분류되게 한다.
 * - 아우터를 팬츠보다 앞에 둬 "데님 점퍼"가 아우터로 분류되게 한다.</p>
 */
public enum ProductCategory {

    JACKET("자켓", "자켓", "셔켓"),
    DRESS("원피스", "원피스", "드레스"),
    SKIRT("스커트", "스커트", "치마"),
    OUTER("아우터", "점퍼", "패딩", "다운필", "푸퍼", "코트", "베스트", "야상",
            "봄버", "플리스", "후리스", "가디건", "집업", "판초", "브레이커", "아노락"),
    PANTS("팬츠", "팬츠", "바지", "슬랙스", "데님", "청바지", "레깅스"),
    BLOUSE("블라우스", "블라우스", "셔츠"),
    KNIT("니트", "니트", "스웨터"),
    TSHIRT("티셔츠", "티셔츠", "맨투맨", "후드티", "스웨트", "티"),
    ETC("기타");

    private final String label;
    private final List<String> keywords;

    ProductCategory(String label, String... keywords) {
        this.label = label;
        this.keywords = List.of(keywords);
    }

    /** 화면 표시용 한글 라벨. */
    public String getLabel() {
        return label;
    }

    /**
     * 상품명을 카테고리로 분류한다. 선언 순서대로 키워드 포함 여부를 검사한다.
     *
     * @param productName 상품명 (null·빈 문자열이면 {@link #ETC})
     * @return 매칭된 카테고리, 없으면 {@link #ETC}
     */
    public static ProductCategory classify(String productName) {
        if (!StringUtils.hasText(productName)) {
            return ETC;
        }
        for (ProductCategory category : values()) {
            for (String keyword : category.keywords) {
                if (productName.contains(keyword)) {
                    return category;
                }
            }
        }
        return ETC;
    }
}
