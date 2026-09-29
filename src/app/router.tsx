import { type ComponentType, Suspense, lazy } from 'react'
import { Navigate, type RouteObject, createBrowserRouter } from 'react-router-dom'

import { AppLayout } from './AppLayout'
import { RequireAuth } from './RequireAuth'
import { RouteErrorBoundary, RouteSkeleton } from './RouteBoundary'
import { allPrivateRouteSegments } from './nav/navigation'

/**
 * §2.1.4 — every route is lazy-loaded and wrapped in an error boundary and a
 * Suspense fallback. A crash in one module must never blank the whole app, so
 * each route carries its own `errorElement`; for private routes that boundary
 * renders *inside* AppLayout, leaving the sidebar, tab bar and header alive.
 *
 * Components are named exports, so each loader maps the named export onto the
 * `default` shape React.lazy expects.
 */
function lazyRoute(loader: () => Promise<{ default: ComponentType }>) {
  const Component = lazy(loader)
  return (
    <Suspense fallback={<RouteSkeleton />}>
      <Component />
    </Suspense>
  )
}

const PUBLIC_ROUTES: RouteObject[] = [
  {
    path: '/',
    element: lazyRoute(() =>
      import('@/routes/public/Landing').then((m) => ({ default: m.Landing })),
    ),
  },
  {
    path: '/features',
    element: lazyRoute(() =>
      import('@/routes/public/Features').then((m) => ({ default: m.Features })),
    ),
  },
  {
    path: '/stages',
    element: lazyRoute(() => import('@/routes/public/Stages').then((m) => ({ default: m.Stages }))),
  },
  {
    path: '/pricing',
    element: lazyRoute(() =>
      import('@/routes/public/Pricing').then((m) => ({ default: m.Pricing })),
    ),
  },
  {
    path: '/faq',
    element: lazyRoute(() => import('@/routes/public/Faq').then((m) => ({ default: m.Faq }))),
  },
  {
    path: '/request-centre',
    element: lazyRoute(() =>
      import('@/routes/public/RequestCentre').then((m) => ({ default: m.RequestCentre })),
    ),
  },
  {
    /*
     * Insurance Review has its own seven-step form (§9.3's reference
     * implementation); the other three services share ServiceRequest, which
     * also answers an unknown service name with a way back to the index.
     */
    path: '/request-centre/insurance-review',
    element: lazyRoute(() =>
      import('@/routes/public/InsuranceReviewForm').then((m) => ({
        default: m.InsuranceReviewForm,
      })),
    ),
  },
  {
    path: '/request-centre/:service',
    element: lazyRoute(() =>
      import('@/routes/public/ServiceRequest').then((m) => ({ default: m.ServiceRequest })),
    ),
  },
  {
    path: '/about',
    element: lazyRoute(() => import('@/routes/public/About').then((m) => ({ default: m.About }))),
  },
  {
    path: '/contact',
    element: lazyRoute(() =>
      import('@/routes/public/Contact').then((m) => ({ default: m.Contact })),
    ),
  },
  {
    path: '/forgot-password',
    element: lazyRoute(() =>
      import('@/routes/public/ForgotPassword').then((m) => ({ default: m.ForgotPassword })),
    ),
  },
  {
    path: '/legal/:doc',
    element: lazyRoute(() => import('@/routes/public/Legal').then((m) => ({ default: m.Legal }))),
  },
  {
    path: '/auth',
    element: lazyRoute(() =>
      import('@/routes/public/Auth').then((module) => ({ default: module.Auth })),
    ),
  },
].map((route) => ({ ...route, errorElement: <RouteErrorBoundary /> }))

/**
 * The 25 private routes, generated from the one navigation table so §5.1 and §6
 * cannot drift apart. A segment with an entry in REAL_SCREENS gets its real
 * screen; everything else still resolves to the shared stub, so adding a screen
 * is one line here and never a change to the route table itself.
 */
const REAL_SCREENS: Record<string, () => Promise<{ default: ComponentType }>> = {
  dashboard: () => import('@/routes/app/Dashboard').then((m) => ({ default: m.Dashboard })),

  /* Group index routes — §5.2's three middle tabs need a real destination. */
  money: () => import('@/routes/app/GroupIndex').then((m) => ({ default: m.GroupIndex })),
  wealth: () => import('@/routes/app/GroupIndex').then((m) => ({ default: m.GroupIndex })),
  growth: () => import('@/routes/app/GroupIndex').then((m) => ({ default: m.GroupIndex })),

  income: () => import('@/routes/app/money/Income').then((m) => ({ default: m.Income })),
  'income-opportunities': () =>
    import('@/routes/app/money/IncomeOpportunities').then((m) => ({
      default: m.IncomeOpportunities,
    })),
  budget: () => import('@/routes/app/money/Budget').then((m) => ({ default: m.Budget })),
  'emi-credit': () =>
    import('@/routes/app/money/EmiCredit').then((m) => ({ default: m.EmiCredit })),
  tax: () => import('@/routes/app/money/Tax').then((m) => ({ default: m.Tax })),

  investments: () =>
    import('@/routes/app/wealth/Investments').then((m) => ({ default: m.Investments })),
  goals: () => import('@/routes/app/wealth/Goals').then((m) => ({ default: m.Goals })),
  assets: () => import('@/routes/app/wealth/Assets').then((m) => ({ default: m.Assets })),
  insurance: () => import('@/routes/app/wealth/Insurance').then((m) => ({ default: m.Insurance })),

  learning: () => import('@/routes/app/growth/Learning').then((m) => ({ default: m.Learning })),
  'morning-club': () =>
    import('@/routes/app/growth/MorningClub').then((m) => ({ default: m.MorningClub })),
  achievements: () =>
    import('@/routes/app/growth/Achievements').then((m) => ({ default: m.Achievements })),
  referrals: () => import('@/routes/app/growth/Referrals').then((m) => ({ default: m.Referrals })),

  assistant: () => import('@/routes/app/tools/Assistant').then((m) => ({ default: m.Assistant })),
  documents: () => import('@/routes/app/tools/Documents').then((m) => ({ default: m.Documents })),
  'expert-chat': () =>
    import('@/routes/app/tools/ExpertChat').then((m) => ({ default: m.ExpertChat })),
  family: () => import('@/routes/app/tools/Family').then((m) => ({ default: m.Family })),
  settings: () => import('@/routes/app/tools/Settings').then((m) => ({ default: m.Settings })),

  onboarding: () => import('@/routes/app/Onboarding').then((m) => ({ default: m.Onboarding })),
  upgrade: () => import('@/routes/app/Upgrade').then((m) => ({ default: m.Upgrade })),
  profile: () => import('@/routes/app/tools/Profile').then((m) => ({ default: m.Profile })),
}

const PRIVATE_CHILDREN: RouteObject[] = [
  { index: true, element: <Navigate to="dashboard" replace /> },
  ...allPrivateRouteSegments().map((segment) => ({
    path: segment,
    element: lazyRoute(
      REAL_SCREENS[segment] ??
        (() => import('@/routes/ModuleStub').then((module) => ({ default: module.ModuleStub }))),
    ),
    errorElement: <RouteErrorBoundary />,
  })),
]

/**
 * The route table, exported separately from the browser router so it can be
 * driven by a memory router (route-resolution checks) without the singleton.
 */
export const routes: RouteObject[] = [
  ...PUBLIC_ROUTES,
  /*
   * The kitchen sink is a developer page — every token, every component, every
   * currency boundary, with spec section numbers all over it. It was reachable
   * in the shipped build by anyone who guessed the URL. `import.meta.env.DEV` is
   * false in `npm run build`, so Rollup drops the whole branch and the import
   * with it: the screen is not merely hidden in the APK, it is not in it.
   */
  ...(import.meta.env.DEV
    ? [
        {
          path: '/dev/kitchen-sink',
          element: lazyRoute(() =>
            import('@/routes/dev/KitchenSink').then((module) => ({ default: module.KitchenSink })),
          ),
          errorElement: <RouteErrorBoundary />,
        },
      ]
    : []),
  {
    path: '/app',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
    children: PRIVATE_CHILDREN,
  },
  {
    /*
     * The one route a lost user is most likely to hit, and it was the only entry
     * without a boundary: if the NotFound chunk fails to load (stale hash after a
     * redeploy, or offline per §2.1.3), react-router falls back to its own
     * unstyled "Unexpected Application Error!" screen. RootErrorBoundary cannot
     * help — RouterProvider handles route render errors internally, before they
     * reach any React boundary above it.
     */
    path: '*',
    element: lazyRoute(() =>
      import('@/routes/NotFound').then((module) => ({ default: module.NotFound })),
    ),
    errorElement: <RouteErrorBoundary standalone />,
  },
]

export const router = createBrowserRouter(routes)
