import type { WorkbenchStore } from '../../domain/ports/workbench';
import { commitChange, db, readSpace } from './database';
export const workbenchStore: WorkbenchStore = {
  read: (spaceId) => readSpace(db, spaceId),
  commit: (spaceId, revision, change) => commitChange(db, spaceId, revision, change),
};
