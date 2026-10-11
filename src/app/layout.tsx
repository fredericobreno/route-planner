import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Route Planner",
};

const RootLayout = ({ children }: LayoutProps<"/">) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
