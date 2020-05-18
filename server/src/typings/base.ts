export interface IListQueryResult<T> {
  items: T[];
  current: number;
  size: number;
  total: number;
}
