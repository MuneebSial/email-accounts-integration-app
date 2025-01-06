import "./globals.css";

export const metadata = {
  title: "Gmail Integration App",
  description: "Connect your Gmail account and manage emails",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
