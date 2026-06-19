import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../constants/theme';

/** 테이블 컬럼 정의 타입입니다. */
export interface TableColumn<T> {
  /** 컬럼 식별 키 */
  key: string;
  /** 헤더 텍스트 */
  label: string;
  /** flex 비율 (width와 함께 사용 불가) */
  flex?: number;
  /** 고정 너비 */
  width?: number;
  /** 셀 텍스트 정렬 */
  align?: 'left' | 'center' | 'right';
  /** 커스텀 셀 렌더러. 미제공 시 row[key] 문자열을 표시합니다. */
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T extends { id?: number | string }> {
  /** 컬럼 정의 배열 */
  columns: TableColumn<T>[];
  /** 행 데이터 배열 */
  data: T[];
  /** 행 탭 핸들러 */
  onRowPress?: (row: T) => void;
  /** 데이터 없을 때 표시할 텍스트 */
  emptyText?: string;
  /** 행 높이 (미사용, 레이아웃은 paddingVertical로 제어) */
  rowHeight?: number;
}

/**
 * 범용 제네릭 테이블 컴포넌트입니다.
 * 헤더, 데이터 행, 빈 상태를 일관된 스타일로 표시합니다.
 *
 * @example
 * ```tsx
 * <DataTable
 *   columns={[
 *     { key: 'productName', label: '상품명', flex: 2 },
 *     { key: 'quantity', label: '수량', flex: 1, align: 'center' },
 *   ]}
 *   data={items}
 *   onRowPress={(item) => handlePress(item)}
 * />
 * ```
 */
export default function DataTable<T extends { id?: number | string }>({
  columns,
  data,
  onRowPress,
  emptyText = '데이터가 없습니다.',
}: DataTableProps<T>) {
  /**
   * 컬럼 레이아웃 스타일을 반환합니다.
   * flex와 width 중 하나만 적용합니다.
   */
  function cellStyle(col: TableColumn<T>) {
    const base: Record<string, unknown> = {
      alignItems: col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start',
    };
    if (col.width != null) {
      base.width = col.width;
    } else {
      base.flex = col.flex ?? 1;
    }
    return base;
  }

  return (
    <View style={styles.wrapper}>
      {/* 헤더 행 */}
      <View style={styles.headerRow}>
        {columns.map((col) => (
          <View key={col.key} style={[styles.headerCell, cellStyle(col)]}>
            <Text style={styles.headerText}>{col.label}</Text>
          </View>
        ))}
      </View>

      {/* 데이터 행 */}
      {data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      ) : (
        data.map((row, index) => {
          const isLast = index === data.length - 1;
          const rowContent = (
            <View
              key={row.id != null ? String(row.id) : String(index)}
              style={[styles.dataRow, isLast && styles.dataRowLast]}
            >
              {columns.map((col) => (
                <View key={col.key} style={[styles.dataCell, cellStyle(col)]}>
                  {col.render ? (
                    col.render(row, index)
                  ) : (
                    <Text style={styles.dataCellText} numberOfLines={1}>
                      {String((row as Record<string, unknown>)[col.key] ?? '-')}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          );

          if (onRowPress) {
            return (
              <TouchableOpacity
                key={row.id != null ? String(row.id) : String(index)}
                onPress={() => onRowPress(row)}
                activeOpacity={0.7}
              >
                {rowContent}
              </TouchableOpacity>
            );
          }

          return rowContent;
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerCell: {
    justifyContent: 'center',
  },
  headerText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dataRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  dataRowLast: {
    borderBottomWidth: 0,
  },
  dataCell: {
    justifyContent: 'center',
  },
  dataCellText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});
