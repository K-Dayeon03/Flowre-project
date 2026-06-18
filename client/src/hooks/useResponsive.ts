import { useWindowDimensions } from 'react-native';

/**
 * 창 너비 기반 반응형 브레이크포인트 및 그리드 컬럼 수를 반환하는 훅입니다.
 * 컴포넌트 렌더링 로직에서 하드코딩된 width 비교 대신 이 훅을 사용합니다.
 */
export function useResponsive() {
  const { width } = useWindowDimensions();

  return {
    /** 640px 미만 */
    isMobile: width < 640,
    /** 640px 이상 1024px 미만 */
    isTablet: width >= 640 && width < 1024,
    /** 1024px 이상 */
    isDesktop: width >= 1024,
    /** 820px 이상 (와이드 대시보드 레이아웃 전환 기준) */
    isWide: width >= 820,
    /** 일반 콘텐츠 그리드 컬럼 수 (모바일 1, 태블릿 2, 데스크톱 3) */
    gridCols: width < 640 ? 1 : width < 1024 ? 2 : 3,
    /**
     * KPI 메트릭 카드 컬럼 수.
     * 4개 카드를 모바일 2열, 태블릿 이상 4열로 배치할 때 사용합니다.
     */
    metricCols: width < 640 ? 2 : 4,
    width,
  };
}
