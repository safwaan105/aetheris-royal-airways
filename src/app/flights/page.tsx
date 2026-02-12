import { NavBar } from "@/components/NavBar";
import { FlightSearchForm } from "@/components/FlightSearchForm";

export default function FlightsPage() {
  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6 space-y-6">
        <section className="card p-6 md:p-8">
          <h1 className="section-title">Search Flights</h1>
          <p className="subtle mt-2">Use FROM, TO, DATE, and PASSENGERS to quickly find flights.</p>
          <div className="mt-5">
            <FlightSearchForm actionPath="/results" />
          </div>
        </section>
      </main>
    </div>
  );
}
