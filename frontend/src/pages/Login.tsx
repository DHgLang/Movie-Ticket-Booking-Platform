import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import PageShell from "../components/PageShell";
import { isSignedIn } from "../lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    isSignedIn().then((ok) => {
      if (ok) navigate("/account", { replace: true });
    });
  }, [navigate]);

  return (
    <PageShell title="Log In / Register" subtitle="Spirit Movie account for booking tickets.">
      <Authenticator loginMechanisms={["email"]}>
        {() => <Navigate to="/account" replace />}
      </Authenticator>
    </PageShell>
  );
}
