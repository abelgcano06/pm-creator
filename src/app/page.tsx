"use client";

import React, { useMemo, useState } from "react";

type EnvFlag =
  | "Alta temperatura"
  | "Mucho polvo / overspray"
  | "Humedad / washdown"
  | "Corrosivo"
  | "Solventes / explosivo"
  | "24/7"
  | "Muchos ciclos"
  | "Acceso difícil";

type ComponentType = "Motor" | "VFD" | "PLC" | "Sensor" | "Rodamiento" | "Filtro";

type Component = {
  id: string;
  type: ComponentType;
  qty: number;
  manufacturer?: string;
  model?: string;
  hasPID?: boolean;
  hp?: number;
};

type PMTask = {
  componentType: ComponentType;
  tarea: string;
  metodo: "Visual" | "Medición" | "Prueba" | "Limpieza" | "Lubricación" | "Ajuste";
  frecuencia: "Diario" | "Semanal" | "Mensual" | "Trimestral" | "Semestral" | "Anual" | "Por condición" | "Por horas";
  criterio: string;
  porque: string;
};

const uid = () => Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);

const envFlags: EnvFlag[] = [
  "Alta temperatura",
  "Mucho polvo / overspray",
  "Humedad / washdown",
  "Corrosivo",
  "Solventes / explosivo",
  "24/7",
  "Muchos ciclos",
  "Acceso difícil",
];

function bumpFrecuencia(base: PMTask["frecuencia"], flags: Record<EnvFlag, boolean>) {
  const severo =
    flags["Alta temperatura"] ||
    flags["Mucho polvo / overspray"] ||
    flags["Solventes / explosivo"] ||
    flags["24/7"] ||
    flags["Muchos ciclos"];

  if (!severo) return base;

  const order: PMTask["frecuencia"][] = ["Anual", "Semestral", "Trimestral", "Mensual", "Semanal", "Diario"];
  if (base === "Por condición" || base === "Por horas") return base;

  const idx = order.indexOf(base);
  return idx >= 0 ? order[Math.min(idx + 1, order.length - 1)] : base;
}

function generarTareas(flags: Record<EnvFlag, boolean>, comps: Component[]): PMTask[] {
  const tasks: PMTask[] = [];

  for (const c of comps) {
    if (c.type === "Motor") {
      tasks.push({
        componentType: c.type,
        tarea: "Inspeccionar motor (polvo/overspray, caja de conexiones, ventilación).",
        metodo: "Visual",
        frecuencia: bumpFrecuencia("Semanal", flags),
        criterio: "Sin acumulación excesiva, sin conduits flojos, ventilación libre.",
        porque: "Previene sobrecalentamiento y fallas por contaminación/conexiones flojas.",
      });
      tasks.push({
        componentType: c.type,
        tarea: "Medir corriente y comparar vs baseline.",
        metodo: "Medición",
        frecuencia: bumpFrecuencia("Mensual", flags),
        criterio: "Dentro de rango esperado, sin desbalance anormal.",
        porque: "La carga mecánica o problemas eléctricos se reflejan en corriente.",
      });
    }

    if (c.type === "VFD") {
      tasks.push({
        componentType: c.type,
        tarea: "Revisar/limpiar ventilación, ventiladores y filtros del gabinete.",
        metodo: "Limpieza",
        frecuencia: bumpFrecuencia("Mensual", flags),
        criterio: "Filtros limpios, ventiladores operativos, sin alarmas de sobretemp.",
        porque: "El calor/polvo son causas top de fallas en drives.",
      });
      if (c.hasPID) {
        tasks.push({
          componentType: c.type,
          tarea: "Verificar estabilidad del PID (oscilación/hunting).",
          metodo: "Medición",
          frecuencia: bumpFrecuencia("Trimestral", flags),
          criterio: "Control estable, sin oscilación persistente.",
          porque: "PID inestable estresa motor/proceso y aumenta fallas.",
        });
      }
    }

    if (c.type === "PLC") {
      tasks.push({
        componentType: c.type,
        tarea: "Revisión gabinete PLC: temperatura, limpieza, LEDs.",
        metodo: "Visual",
        frecuencia: bumpFrecuencia("Mensual", flags),
        criterio: "Temp normal, sin polvo excesivo, LEDs normales.",
        porque: "Contaminación/temperatura causan fallas intermitentes.",
      });
    }

    if (c.type === "Sensor") {
      tasks.push({
        componentType: c.type,
        tarea: "Limpiar sensor y verificar montaje/alineación.",
        metodo: "Limpieza",
        frecuencia: bumpFrecuencia("Mensual", flags),
        criterio: "Bracket firme, detección consistente.",
        porque: "Suciedad/desalineación = falsos disparos y paros intermitentes.",
      });
      tasks.push({
        componentType: c.type,
        tarea: "Prueba funcional: validar cambio de señal (LED/entrada PLC).",
        metodo: "Prueba",
        frecuencia: bumpFrecuencia("Trimestral", flags),
        criterio: "Sin chatter, detección repetible.",
        porque: "Detecta cables fatigados y fallas intermitentes.",
      });
    }

    if (c.type === "Rodamiento") {
      tasks.push({
        componentType: c.type,
        tarea: "Inspección: ruido, temperatura, juego, sellos.",
        metodo: "Visual",
        frecuencia: bumpFrecuencia("Semanal", flags),
        criterio: "Sin ruido anormal y temperatura normal.",
        porque: "Detección temprana evita fallas catastróficas.",
      });
    }

    if (c.type === "Filtro") {
      tasks.push({
        componentType: c.type,
        tarea: "Inspeccionar condición del filtro y reemplazar por condición.",
        metodo: "Visual",
        frecuencia: bumpFrecuencia("Mensual", flags),
        criterio: "Sin roturas, buen asiento, no saturado.",
        porque: "Filtro saturado causa sobrecalentamiento/caída de desempeño.",
      });
    }
  }

  // dedup simple
  const seen = new Set<string>();
  return tasks.filter((t) => {
    const k = `${t.componentType}|${t.tarea}|${t.metodo}|${t.frecuencia}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export default function Page() {
  const [flags, setFlags] = useState<Record<EnvFlag, boolean>>(
    Object.fromEntries(envFlags.map((f) => [f, false])) as Record<EnvFlag, boolean>
  );

  const [components, setComponents] = useState<Component[]>([
    { id: uid(), type: "PLC", qty: 1, manufacturer: "Siemens", model: "S7-1500" },
    { id: uid(), type: "Motor", qty: 1, manufacturer: "WEG", model: "TEFC", hp: 20 },
    { id: uid(), type: "VFD", qty: 1, manufacturer: "Mitsubishi", model: "FR-E800", hasPID: true },
    { id: uid(), type: "Sensor", qty: 6 },
    { id: uid(), type: "Filtro", qty: 4 },
  ]);

  const tareas = useMemo(() => generarTareas(flags, components), [flags, components]);

  const addComponent = (type: ComponentType) => {
    setComponents((c) => [{ id: uid(), type, qty: 1 }, ...c]);
  };

  return (
    <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>PM Creator — Demo</h1>
      <p style={{ opacity: 0.7, marginTop: 6 }}>
        Esto ya es tu app (base). Luego metemos tu prototipo pro con shadcn y generador SAP PM + Troubleshooting.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
        <section style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Contexto (ambiente/operación)</h2>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {envFlags.map((f) => (
              <label key={f} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={flags[f]}
                  onChange={(e) => setFlags((p) => ({ ...p, [f]: e.target.checked }))}
                />
                {f}
              </label>
            ))}
          </div>
        </section>

        <section style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Componentes</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {(["Motor", "VFD", "PLC", "Sensor", "Rodamiento", "Filtro"] as ComponentType[]).map((t) => (
              <button
                key={t}
                onClick={() => addComponent(t)}
                style={{ border: "1px solid #ccc", borderRadius: 999, padding: "6px 10px", cursor: "pointer" }}
              >
                + {t}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {components.map((c) => (
              <div key={c.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 800 }}>
                  {c.type} <span style={{ opacity: 0.6 }}>(qty {c.qty})</span>
                </div>
                <div style={{ opacity: 0.7, fontSize: 13 }}>
                  {c.manufacturer || "—"} {c.model || ""} {c.hp ? `| ${c.hp} HP` : ""} {c.hasPID ? "| PID" : ""}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900 }}>Output PM — {tareas.length} tareas</h2>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {tareas.map((t, i) => (
            <div key={i} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 900 }}>{t.componentType}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {t.frecuencia} · {t.metodo}
                </div>
              </div>
              <div style={{ marginTop: 6 }}>{t.tarea}</div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                <b>Criterio:</b> {t.criterio}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                <b>Por qué:</b> {t.porque}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
