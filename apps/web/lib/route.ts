'use client';

import { useCallback, useEffect, useState } from 'react';

export type Page = 'home' | 'projects' | 'project' | 'members' | 'settings';
export type Route = { page: Page; workspaceId?: string; projectId?: string; taskId?: string };

const pages: readonly Page[] = ['home', 'projects', 'project', 'members', 'settings'];

function read(): Route {
  const query = new URLSearchParams(window.location.search);
  const page = query.get('p') as Page | null;
  return { page: page && pages.includes(page) ? page : 'home', workspaceId: query.get('w') ?? undefined, projectId: query.get('id') ?? undefined, taskId: query.get('task') ?? undefined };
}

export function routeHref(route: Route) {
  const query = new URLSearchParams();
  if (route.workspaceId) query.set('w', route.workspaceId);
  if (route.page !== 'home') query.set('p', route.page);
  if (route.projectId) query.set('id', route.projectId);
  if (route.taskId) query.set('task', route.taskId);
  const text = query.toString();
  return text ? `/?${text}` : '/';
}

/** Each screen has its own address, so the back button, refresh and shared links all work. */
export function useRoute() {
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const sync = () => setRoute(read());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  const navigate = useCallback((next: Route, options?: { replace?: boolean }) => {
    window.history[options?.replace ? 'replaceState' : 'pushState'](null, '', routeHref(next));
    setRoute(next);
    if (!options?.replace && !next.taskId) window.scrollTo({ top: 0 });
  }, []);
  return [route, navigate] as const;
}
