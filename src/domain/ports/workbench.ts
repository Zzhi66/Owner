import type { WorkbenchState } from '../models';
export interface WorkspaceHeader {
  id: string;
  name: string;
  kind: 'personal' | 'demo' | 'prototype';
  revision: number;
}
export interface WorkbenchSnapshot {
  space: WorkspaceHeader;
  state: WorkbenchState;
}
/** A write resolves only after the durable transaction commits; errors preserve the old snapshot. */
export interface WorkbenchStore {
  read(spaceId: string): Promise<WorkbenchSnapshot>;
  commit(
    spaceId: string,
    expectedRevision: number,
    change: (draft: WorkbenchState) => void,
  ): Promise<WorkbenchSnapshot>;
}
