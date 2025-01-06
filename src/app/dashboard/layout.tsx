import Navbar from "@/components/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Navbar />
      <main className="container mx-auto p-8 bg-gray-100 min-h-screen">
        {children}
      </main>
    </div>
  );
}
