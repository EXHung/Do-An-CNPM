'use client';

import { createContext, useContext } from 'react';
import type { Member, User, Workspace } from '../lib/api';
import type { Route } from '../lib/route';

export type Report = (next: { error?: string; notice?: string }) => void;

export type WorkspaceContextValue = {
  workspace: Workspace;
  user: User;
  members: Member[];
  /** Changes whenever project or task data changes, so open pages reload. */
  dataKey: number;
  touchData: () => void;
  reloadWorkspaces: () => Promise<void>;
  reloadMembers: () => Promise<void>;
  report: Report;
  fail: (err: unknown) => void;
  go: (route: Omit<Route, 'workspaceId'>) => void;
  openTask: (taskId: string) => void;
  href: (route: Omit<Route, 'workspaceId'>) => string;
};

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceApp.');
  return value;
}
