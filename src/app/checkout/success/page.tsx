import { NavBar } from "@/components/NavBar";
import { CheckoutSuccessClient } from "@/components/CheckoutSuccessClient";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const resolved = await searchParams;

  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6 max-w-2xl">
        <section className="card p-6 md:p-8">
          <h1 className="section-title">Checkout Success</h1>
          <CheckoutSuccessClient sessionId={resolved.session_id} />
        </section>
      </main>
    </div>
  );
}
