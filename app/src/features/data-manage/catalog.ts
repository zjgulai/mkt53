import { coreDataModules } from './catalog-core';
import { erpDataModules } from './catalog-erp';

export const dataModules = [
  ...coreDataModules.slice(0, 5),
  ...erpDataModules,
  ...coreDataModules.slice(5),
];
