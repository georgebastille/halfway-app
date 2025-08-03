import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Halfway",
  description: "Find the fairest place to meet in London",
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}