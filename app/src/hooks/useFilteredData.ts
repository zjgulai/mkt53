// R30: 带memo的筛选Hook — 大数据集性能优化
import { useState, useMemo } from 'react';

export function useFilteredData<T>(
  data: T[],
  filterFn: (item: T, query: string) => boolean
) {
  const [filterQuery, setFilterQuery] = useState('');

  const filtered = useMemo(() => {
    if (!filterQuery.trim()) return data;
    return data.filter(item => filterFn(item, filterQuery));
  }, [data, filterQuery, filterFn]);

  return { filterQuery, setFilterQuery, filtered };
}
