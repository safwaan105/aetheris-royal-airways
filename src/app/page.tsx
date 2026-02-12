import { NavBar } from "@/components/NavBar";
import { FlightSearchForm } from "@/components/FlightSearchForm";

export default function Home() {
  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6 space-y-6 fade-in">
        <section className="glass-panel p-6 md:p-8">
          <p className="chip inline-flex">Aetheris Royal Booking</p>
          <h1 className="section-title mt-4 max-w-2xl">
            High-energy premium booking with zero learning curve.
          </h1>
          <p className="subtle mt-3 max-w-3xl text-lg">
            Vivid visuals, strict alignment, large controls, and fast actions for every traveler.
          </p>
          <div className="mt-5">
            <FlightSearchForm actionPath="/results" />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="card p-5">
            <h2 className="text-lg font-extrabold text-[#d7e9ff]">Standard Tier</h2>
            <p className="subtle mt-2">Price-first flight options with quick compare list and best value sorting.</p>
          </article>
          <article className="card-luxury p-5">
            <h2 className="text-lg font-extrabold">Luxury Tier</h2>
            <p className="mt-2 text-[#e4d6b5]">Gold and obsidian visual lane with premium cabin details and amenities.</p>
          </article>
          <article className="card p-5">
            <h2 className="text-lg font-extrabold text-[#d7e9ff]">Guided 4-Step Flow</h2>
            <p className="subtle mt-2">Passenger details, seat map, payment, then instant digital ticket generation.</p>
          </article>
        </section>
      </main>
    </div>
  );
}
