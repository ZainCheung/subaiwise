import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { HomePage } from './routes/home'
import { MethodologyPage } from './routes/methodology'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>): { s?: string } => ({
    s: typeof search.s === 'string' ? search.s : undefined,
  }),
  component: HomePage,
})

const methodologyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/methodology',
  component: MethodologyPage,
})

const routeTree = rootRoute.addChildren([indexRoute, methodologyRoute])

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
