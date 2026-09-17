"use client";

import { useEffect, useState } from "react";

export default function BotonIrArriba() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const manejarScroll = () => {
      setVisible(window.scrollY > 220);
    };

    manejarScroll();
    window.addEventListener("scroll", manejarScroll);

    return () => window.removeEventListener("scroll", manejarScroll);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Subir al inicio"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        width: 48,
        height: 48,
        borderRadius: "50%",
        border: "none",
        background: "#176B87",
        color: "#fff",
        boxShadow: "0 12px 28px rgba(23, 107, 135, 0.32)",
        cursor: "pointer",
        fontSize: 22,
        fontWeight: 800,
        lineHeight: 1,
        zIndex: 1300,
      }}
    >
      ↑
    </button>
  );
}
