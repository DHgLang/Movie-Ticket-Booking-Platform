import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import PageShell from "../components/PageShell";
import { isSignedIn } from "../lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from ||
    new URLSearchParams(location.search).get("from") ||
    "/account";

  useEffect(() => {
    isSignedIn().then((ok) => {
      if (ok) navigate(from, { replace: true });
    });
  }, [navigate, from]);

  return (
    <PageShell title="Log In / Register" subtitle="Spirit Movie account for booking tickets.">
      <Authenticator loginMechanisms={["email"]}>
        {() => <Navigate to={from} replace />}
      </Authenticator>
    </PageShell>
  );
}
