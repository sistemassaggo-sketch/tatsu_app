"use client";

import { useRouter } from "next/navigation";

export default function SelectorAnioReportes({ anios, anioActual }: { anios: number[]; anioActual: number }) {
  const router = useRouter();

  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 14, color: "#475569" }}>
      Año
      <select
        value={anioActual}
        onChange={(evento) => router.push(`/dashboard/reportes?anio=${evento.target.value}`, { scroll: false })}
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          padding: "8px 10px",
          font: "inherit",
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        {anios.map((anioOpcion) => (
          <option key={anioOpcion} value={anioOpcion}>
            {anioOpcion}
          </option>
        ))}
      </select>
    </label>
  );
}
