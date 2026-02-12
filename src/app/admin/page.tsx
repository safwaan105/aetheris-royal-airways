"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";

interface AdminFlight {
  _id: string;
  flightNumber: string;
  airline: string;
  airlineImageUrl: string;
  route: { from: string; to: string };
  departureAt: string;
  arrivalAt: string;
  basePrice: number;
  vesselType: string;
  amenities: string[];
  capacity: number;
  availableSeats: number;
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function isValidSchedule(departureAt: string, arrivalAt: string) {
  const departure = new Date(departureAt);
  const arrival = new Date(arrivalAt);
  return !Number.isNaN(departure.getTime()) && !Number.isNaN(arrival.getTime()) && arrival > departure;
}

function getFormValidationError(form: {
  flightNumber: string;
  airline: string;
  airlineImageUrl: string;
  from: string;
  to: string;
  departureAt: string;
  arrivalAt: string;
  basePrice: string;
  capacity: string;
}) {
  if (form.flightNumber.trim().length < 3) return "Flight number must be at least 3 characters.";
  if (form.airline.trim().length < 2) return "Flight name is required.";
  if (form.airlineImageUrl.trim().length === 0) return "Flight image is required.";
  if (form.from.trim().length !== 3) return "FROM must be a 3-letter airport code.";
  if (form.to.trim().length !== 3) return "TO must be a 3-letter airport code.";
  if (!form.departureAt) return "Departure time is required.";
  if (!form.arrivalAt) return "Arrival time is required.";
  if (!isValidSchedule(form.departureAt, form.arrivalAt)) return "Arrival time must be after departure time.";
  if (!Number.isFinite(Number(form.basePrice)) || Number(form.basePrice) <= 0) return "Base price must be greater than 0.";
  if (!Number.isFinite(Number(form.capacity)) || Number(form.capacity) <= 0) return "Seats capacity must be greater than 0.";
  return "";
}

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [flights, setFlights] = useState<AdminFlight[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragOverImageZone, setDragOverImageZone] = useState(false);
  const [form, setForm] = useState({
    flightNumber: "",
    airline: "",
    airlineImageUrl: "",
    from: "",
    to: "",
    departureAt: "",
    arrivalAt: "",
    basePrice: "700",
    vesselType: "",
    capacity: "120",
    amenities: "Wi-Fi,Meals,Cabin Baggage",
    tier: "standard",
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => {
        if (!data.authenticated || data.user.role !== "admin") {
          router.push("/auth");
          return;
        }
        setAuthorized(true);
      })
      .catch(() => router.push("/auth"))
      .finally(() => setLoading(false));
  }, [router]);

  async function loadFlights() {
    const response = await fetch("/api/admin/flights");
    if (!response.ok) return;
    const data = await response.json();
    setFlights(data);
  }

  useEffect(() => {
    if (!authorized) return;
    queueMicrotask(() => {
      void loadFlights();
    });
  }, [authorized]);

  const validationError = useMemo(() => getFormValidationError(form), [form]);

  function onField(key: keyof typeof form, value: string) {
    setForm((curr) => ({ ...curr, [key]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setUploadingImage(false);
    setForm({
      flightNumber: "",
      airline: "",
      airlineImageUrl: "",
      from: "",
      to: "",
      departureAt: "",
      arrivalAt: "",
      basePrice: "700",
      vesselType: "",
      capacity: "120",
      amenities: "Wi-Fi,Meals,Cabin Baggage",
      tier: "standard",
    });
  }

  async function onImageUpload(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please select a valid image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setMessage("Image is too large. Please keep it under 4MB.");
      return;
    }

    setMessage("");
    setUploadingImage(true);
    try {
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read image."));
        reader.readAsDataURL(file);
      });
      onField("airlineImageUrl", imageDataUrl);
      setMessage("Image loaded. Save flight to apply.");
    } catch {
      setMessage("Failed to load image.");
    } finally {
      setUploadingImage(false);
    }
  }

  function formatTiming(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString([], {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  async function submitFlight() {
    setMessage("");
    if (validationError) {
      setMessage(validationError);
      return;
    }

    const amenities = form.amenities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => item !== "__TIER_STANDARD" && item !== "__TIER_LUXURY");
    amenities.push(form.tier === "luxury" ? "__TIER_LUXURY" : "__TIER_STANDARD");

    const payload = {
      flightNumber: form.flightNumber,
      airline: form.airline,
      airlineImageUrl: form.airlineImageUrl,
      route: { from: form.from.toUpperCase(), to: form.to.toUpperCase() },
      departureAt: new Date(form.departureAt).toISOString(),
      arrivalAt: new Date(form.arrivalAt).toISOString(),
      basePrice: Number(form.basePrice),
      vesselType: form.vesselType || "Commercial Jet",
      amenities,
      capacity: Number(form.capacity),
    };

    const response = await fetch(editingId ? `/api/admin/flights/${editingId}` : "/api/admin/flights", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Failed to save flight.");
      return;
    }

    localStorage.setItem("aetheris_flight_refresh", String(Date.now()));
    setMessage(editingId ? "Flight updated." : "Flight added.");
    resetForm();
    await loadFlights();
  }

  function editFlight(flight: AdminFlight) {
    setEditingId(flight._id);
    const isLuxury = (flight.amenities || []).includes("__TIER_LUXURY");
    const cleanedAmenities = (flight.amenities || []).filter((item) => item !== "__TIER_STANDARD" && item !== "__TIER_LUXURY");

    setForm({
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      airlineImageUrl: flight.airlineImageUrl,
      from: flight.route.from,
      to: flight.route.to,
      departureAt: toDateTimeLocal(flight.departureAt),
      arrivalAt: toDateTimeLocal(flight.arrivalAt),
      basePrice: String(flight.basePrice),
      vesselType: flight.vesselType,
      capacity: String(flight.capacity),
      amenities: cleanedAmenities.join(","),
      tier: isLuxury ? "luxury" : "standard",
    });
  }

  async function deleteFlight(id: string) {
    if (!window.confirm("Delete this flight?")) return;
    const response = await fetch(`/api/admin/flights/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage("Failed to delete flight.");
      return;
    }
    localStorage.setItem("aetheris_flight_refresh", String(Date.now()));
    await loadFlights();
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <main className="app-shell mt-6">Checking admin access...</main>
      </div>
    );
  }
  if (!authorized) return null;

  return (
    <div className="min-h-screen pb-12">
      <NavBar />
      <main className="app-shell mt-6">
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <aside className="card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[#98b4db]">Business Engine</p>
            <h1 className="mt-2 text-xl font-extrabold text-[#e8f2ff]">Admin Console</h1>
            <p className="subtle mt-2 text-sm">Manage flights with instant frontend sync.</p>
            <div className="mt-4 grid gap-2">
              <Link href="/admin/bookings" className="btn-secondary !min-h-9 px-3">View Bookings</Link>
              <Link href="/admin/users" className="btn-secondary !min-h-9 px-3">View Users</Link>
              <Link href="/admin/payments" className="btn-secondary !min-h-9 px-3">View Payments</Link>
              <Link href="/admin/support" className="btn-secondary !min-h-9 px-3">Manage Support</Link>
            </div>
          </aside>

          <section className="card p-5">
            <h2 className="text-xl font-extrabold text-[#eaf3ff]">{editingId ? "Edit Flight" : "New Flight"}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="field" placeholder="Flight Number" value={form.flightNumber} onChange={(e) => onField("flightNumber", e.target.value)} />
              <input className="field" placeholder="Flight Name" value={form.airline} onChange={(e) => onField("airline", e.target.value)} />
              <div className="md:col-span-2">
                <p className="mb-1 text-xs font-bold text-[#9bb0cf]">Upload New Flight Image</p>
                <div
                  className={`mb-2 flex min-h-24 items-center justify-center rounded-xl border border-dashed p-3 text-sm ${
                    dragOverImageZone ? "border-[#79b3ff] bg-[#1f2e47]" : "border-[#344059] bg-[#111a2e]"
                  } text-[#a7b9d8]`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverImageZone(true);
                  }}
                  onDragLeave={() => setDragOverImageZone(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverImageZone(false);
                    void onImageUpload(e.dataTransfer.files?.[0] ?? null);
                  }}
                >
                  Drag and drop image here
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="field"
                  onChange={(e) => {
                    void onImageUpload(e.target.files?.[0] ?? null);
                    e.currentTarget.value = "";
                  }}
                />
              </div>
              <input className="field md:col-span-2" placeholder="Image URL from Chrome/Web" value={form.airlineImageUrl} onChange={(e) => onField("airlineImageUrl", e.target.value)} />
              <div className="md:col-span-2">
                <p className="mb-1 text-xs font-bold text-[#9bb0cf]">Image Preview</p>
                <div className="relative h-36 overflow-hidden rounded-xl border border-[#2f3956] bg-[#121a2e]">
                  {form.airlineImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.airlineImageUrl} alt="Flight preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#7f93b7]">Paste an image URL to preview</div>
                  )}
                </div>
              </div>
              <input className="field" placeholder="From (3-letter)" value={form.from} onChange={(e) => onField("from", e.target.value.toUpperCase().slice(0, 3))} />
              <input className="field" placeholder="To (3-letter)" value={form.to} onChange={(e) => onField("to", e.target.value.toUpperCase().slice(0, 3))} />
              <input type="datetime-local" className="field" value={form.departureAt} onChange={(e) => onField("departureAt", e.target.value)} />
              <input type="datetime-local" className="field" value={form.arrivalAt} onChange={(e) => onField("arrivalAt", e.target.value)} />
              <input className="field" placeholder="Base Price" value={form.basePrice} onChange={(e) => onField("basePrice", e.target.value)} />
              <input className="field" placeholder="Seats Capacity" value={form.capacity} onChange={(e) => onField("capacity", e.target.value)} />
              <input className="field md:col-span-2" placeholder="Amenities (comma separated)" value={form.amenities} onChange={(e) => onField("amenities", e.target.value)} />
              <div className="md:col-span-2">
                <p className="mb-1 text-xs font-bold text-[#9bb0cf]">Tier Selector</p>
                <div className="inline-flex rounded-full border border-[#344059] p-1">
                  <button className={`rounded-full px-4 py-2 text-sm ${form.tier === "standard" ? "bg-[#293858] text-white" : "text-[#9fb4d7]"}`} onClick={() => onField("tier", "standard")}>Standard</button>
                  <button className={`rounded-full px-4 py-2 text-sm ${form.tier === "luxury" ? "bg-[#5b4621] text-[#ffd78d]" : "text-[#9fb4d7]"}`} onClick={() => onField("tier", "luxury")}>Luxury</button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-primary" onClick={submitFlight} disabled={uploadingImage}>
                {uploadingImage ? "Uploading Image..." : editingId ? "Update Flight" : "Save Flight"}
              </button>
              {editingId && <button className="btn-secondary" onClick={resetForm}>Cancel</button>}
            </div>
            {message && <p className="mt-3 text-sm text-[#9fd5ff]">{message}</p>}
          </section>
        </div>

        <section className="card mt-5 p-5">
          <h2 className="text-xl font-extrabold text-[#e8f2ff]">Flight Inventory</h2>
          <div className="table-wrap mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th>Flight</th>
                  <th>Route</th>
                  <th>Timing</th>
                  <th>Price</th>
                  <th>Seats</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {flights.map((flight) => (
                  <tr key={flight._id}>
                    <td>{flight.flightNumber}</td>
                    <td>{flight.route.from} to {flight.route.to}</td>
                    <td>
                      {formatTiming(flight.departureAt)} to {formatTiming(flight.arrivalAt)}
                    </td>
                    <td>${flight.basePrice}</td>
                    <td>{flight.availableSeats}/{flight.capacity}</td>
                    <td className="space-x-2">
                      <button className="btn-secondary !min-h-9 px-3" onClick={() => editFlight(flight)}>Edit</button>
                      <button className="btn-secondary !min-h-9 px-3" onClick={() => deleteFlight(flight._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
