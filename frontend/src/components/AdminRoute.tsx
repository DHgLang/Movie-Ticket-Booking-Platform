import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isAdminUser } from "../lib/auth";

type Props = {
  children: ReactNode;
};

export default function AdminRoute({ children }: Props) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    isAdminUser(true).then(setAllowed);
  }, []);

  if (allowed === null) {
    return <p className="gv-container gv-page">Checking access…</p>;
  }

  if (!allowed) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
