import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function PageShell({ title, subtitle, children }: Props) {
  return (
    <div className="gv-container gv-page">
      <h1 className="gv-page-title">{title}</h1>
      {subtitle && <p className="gv-page-sub">{subtitle}</p>}
      {children}
    </div>
  );
}
