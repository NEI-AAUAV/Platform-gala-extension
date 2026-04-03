import { Navigate } from "react-router-dom";

//* Pages
import Layout from "@/pages/Layout";
import ErrorBoundary from "@/pages/ErrorBoundary";

import { useUserStore, UserState } from "@/stores/useUserStore";

function ProtectedRoute({
  children,
  loggedIn = true,
  redirect = "/auth/login",
}: Readonly<{
  children: React.ReactNode;
  loggedIn?: boolean;
  redirect?: string;
}>) {
  const { sessionLoading, token, scopes } = useUserStore(
    (state: UserState) => state,
  );

  if (sessionLoading) return null;
  console.log(scopes);
  if (!!token === loggedIn) {
    // Optional: Check for specific scopes if needed
    if (loggedIn && scopes && !scopes.includes("admin")) {
      return <Navigate to="/" />;
    }
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{children}</>;
  }
  return <Navigate to={redirect} />;
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
        children: [
          {
            path: "/reserve/:tableId",
            async lazy() {
              const { default: Reserve } = await import("@/pages/Reserve");
              return { Component: Reserve };
            },
          },
        ],
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
              <ProtectedRoute>
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
        path: "*",
        element: <Navigate to="/" />,
      },
    ],
  },
];

export default routes;
