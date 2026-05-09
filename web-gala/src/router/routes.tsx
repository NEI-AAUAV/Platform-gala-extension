import { Navigate } from "react-router-dom";

//* Pages
import Layout from "@/pages/Layout";
import ErrorBoundary from "@/pages/ErrorBoundary";

import { useUserStore, UserState } from "@/stores/useUserStore";

const ADMIN_SCOPES = new Set(["admin", "manager-jantar-gala", "manager-gala"]);

function ProtectedRoute({
  children,
  adminOnly = false,
}: Readonly<{
  children: React.ReactNode;
  adminOnly?: boolean;
}>) {
  const { sessionLoading, token, scopes } = useUserStore(
    (state: UserState) => state,
  );

  if (sessionLoading) return null;

  if (!token) return <Navigate to="/" />;

  if (adminOnly && !scopes?.some((s) => ADMIN_SCOPES.has(s))) {
    return <Navigate to="/" />;
  }

  return children;
}

const routes = [
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: "/",
        async lazy() {
          const { default: Home } = await import("@/pages/Home");
          return { Component: Home };
        },
      },
      {
        path: "/reserve",
        async lazy() {
          const { default: Reserve } = await import("@/pages/Reserve");
          return { Component: Reserve };
        },
      },
      {
        path: "/reserve/:tableId",
        async lazy() {
          const { default: Reserve } = await import("@/pages/Reserve");
          return { Component: Reserve };
        },
      },
      {
        path: "/vote",
        async lazy() {
          const { default: Vote } = await import("@/pages/Vote");
          return {
            Component: () => (
              <ProtectedRoute>
                <Vote />
              </ProtectedRoute>
            ),
          };
        },
      },
      {
        path: "/admin",
        async lazy() {
          const { default: Admin } = await import("@/pages/Admin");
          return {
            Component: () => (
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            ),
          };
        },
      },
      {
        path: "/register",
        async lazy() {
          const { default: Register } = await import("@/pages/Register");
          return { Component: Register };
        },
      },
      {
        path: "/profile",
        async lazy() {
          const { default: Profile } = await import("@/pages/Profile");
          return { Component: Profile };
        },
      },
      {
        path: "*",
        element: <Navigate to="/" />,
      },
    ],
  },
];

export default routes;
