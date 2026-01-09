"use client";

import React, { useMemo, useState } from "react";

type Criticidad = "A" | "B" | "C";

type EnvFlag =
  | "Alta temperatura"
  | "Polvo / overspray"
  | "Humedad / washdown"
  | "Corrosivo"
  | "Solventes / explosivo"
  | "Operación 24/7"
  | "Altos ciclos (arranques/hora)"
  | "Acceso difícil";

type Subsystem =
  | "Control"
  | "Drives / Motion"
  | "Motores"
  | "Instrumentación"
  | "Mecánico"
  | "Neumático"
  | "Proceso"
  | "Seguridad";

type ComponentType =
  | "PLC"
  | "Módulo I/O"
  | "HMI"
  | "VFD"
  | "Motor eléctrico"
  | "Sensor inductivo"
  | "Foto ojo"
  | "Switch límite"
  | "Manómetro / ΔP"
  | "Rodamiento"
  | "Reductor"
  | "Filtro de aire"
  | "Válvula solenoide"
  | "Cilindro neumático"
  | "Quemador (gas)";

type Component = {
  id: string;
  subsystem: Subsystem;
  type: ComponentType;
  qty: number;
  manufacturer?: string;
  model?: string;
  notes?: string;
};

type PMTask = {
  componentType: ComponentType;
  task: string;
  frequency: "Diario" | "Semanal" | "Mensual" | "Trimestral" | "Semestral" | "Anual" | "Por condición";
  method: "Visual" | "Limpieza" | "Medición" | "Prueba funcional" | "Lubricación" | "Ajuste";
  acceptance: string;
  role: "TM" | "TL" | "Supervisor";
  rationale: string;
};

const uid = () => Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);

const allFlags: EnvFlag[] = [
  "Alta temperatura",
  "Polvo / overspray",
  "Humedad / washdown",
  "Corrosivo",
  "Solventes / explosivo",
  "Operación 24/7",
  "Altos ciclos (arranques/hora)",
  "Acceso difícil",
];

const subsystemDefaults: Record<string, Subsystem[]> = {
  "Horno / Casa de aire": ["Control", "Motores", "Instrumentación", "Proceso", "Mecánico", "Seguridad"],
  "Bomba PT/ED": ["Control", "Drives / Motion", "Motores", "Instrumentación", "Mecánico", "Neumático", "Seguridad"],
  "Robot pintura": ["Control", "Drives / Motion", "Instrumentación", "Neumático", "Seguridad"],
  "OPF / IPF": ["Control", "Instrumentación", "Motores", "Mecánico", "Neumático", "Seguridad"],
  "Trolley": ["Control", "Motores", "Instrumentación", "Mecánico", "Seguridad"],
};

const quickAdd: { label: string; subsystem: Subsystem; type: ComponentType }[] = [
  { label: "PLC", subsystem: "Control", type: "PLC" },
  { label: "Módulo I/O", subsystem: "Control", type: "Módulo I/O" },
  { label: "HMI", subsystem: "Control", type: "HMI" },
  { label: "VFD", subsystem: "Drives / Motion", type: "VFD" },
  { label: "Motor", subsystem: "Motores", type: "Motor eléctrico" },
  { label: "Sensor inductivo", subsystem: "Instrumentación", type: "Sensor inductivo" },
  { label: "Foto ojo", subsystem: "Instrumentación", type: "Foto ojo" },
  { label: "Switch límite", subsystem: "Instrumentación", type: "Switch límite" },
  { label: "Manómetro / ΔP", subsystem: "Instrumentación", type: "Manómetro / ΔP" },
  { label: "Rodamiento", subsystem: "Mecánico", type: "Rodamiento" },
  { label: "Reductor", subsystem: "Mecánico", type: "Reductor" },
  { label: "Filtro aire", subsystem: "Proceso", type: "Filtro de aire" },
  { label: "Solenoide", subsystem: "Neumático", type: "Válvula solenoide" },
  { label: "Cilindro", subsystem: "Neumático", type: "Cilindro neumático" },
  { label: "Quemador", subsystem: "Proceso", type: "Quemador (gas)" },
];

// Reglas simples (luego las volvemos “bien cabronas” con IA)
function generatePM(crit: Criticidad, flags: Record<EnvFlag, boolean>, components: Component[]): PMTask[] {
  const severe = flags["Alta temperatura"] || flags["Polvo / overspray"] || flags["Operación 24/7"] || flags["Altos ciclos (arranques/hora)"] || flags["Solventes / explosivo"];

  const bump = (f: PMTask["frequency"]) => {
    if (!severe) return f;
    const order: PMTask["frequency"][] = ["Anual", "Semestral", "Trimestral", "Mensual", "Semanal", "Diario"];
    const i = order.indexOf(f);
    if (i < 0) return f;
    return order[Math.min(i + 1, order.length - 1)];
  };

  const roleFor = (method: PMTask["method"]): PMTask["role"] => {
    if (crit === "A") return method === "Medición" || method === "Prueba funcional" || method === "Ajuste" ? "Supervisor" : "TL";
    if (crit === "B") return method === "Medición" || method === "Prueba funcional" ? "TL" : "TM";
    return "TM";
  };

  const out: PMTask[] = [];
  const add = (t: Omit<PMTask, "role" | "frequency"> & { frequency: PMTask["frequency"] }) => {
    out.push({ ...t, frequency: bump(t.frequency), role: roleFor(t.method) });
  };

  for (const c of components) {
    if (c.type === "Motor eléctrico") {
      add({
        componentType: c.type,
        task: "Inspección visual: limpieza exterior, ventilación, cajas de conexión y conduits.",
        method: "Visual",
        frequency: "Semanal",
        acceptance: "Sin acumulación excesiva, sin cables flojos, ventilación libre.",
        rationale: "Evita sobrecalentamiento y fallas por contaminación/afloje.",
      });
      add({
        componentType: c.type,
        task: "Medir corriente (A) y comparar con baseline bajo carga normal.",
        method: "Medición",
        frequency: "Mensual",
        acceptance: "Dentro de banda esperada; sin desbalance anormal.",
        rationale: "Detecta fricción/carga excesiva y problemas eléctricos.",
      });
    }

    if (c.type === "VFD") {
      add({
        componentType: c.type,
        task: "Limpiar/inspeccionar ventiladores, heatsink y filtros de gabinete (si aplica).",
        method: "Limpieza",
        frequency: "Mensual",
        acceptance: "Sin obstrucciones; ventilación operativa; sin alarmas térmicas.",
        rationale: "Calor + polvo es la causa #1 de fallas en drives.",
      });
      add({
        componentType: c.type,
        task: "Revisar historial de fallas y parámetros críticos; verificar que coincidan con estándar.",
        method: "Prueba funcional",
        frequency: "Trimestral",
        acceptance: "Sin fallas recurrentes; parámetros correctos.",
        rationale: "Fallas repetidas apuntan a problema mecánico/elétrico emergente.",
      });
    }

    if (c.type === "PLC" || c.type === "Módulo I/O") {
      add({
        componentType: c.type,
        task: "Inspección gabinete: temperatura, limpieza, LEDs, tornillería/terminales.",
        method: "Visual",
        frequency: "Mensual",
        acceptance: "Sin sobretemp; LEDs normales; terminales firmes.",
        rationale: "Intermitencias por calor/contaminación/afloje son comunes.",
      });
    }

    if (c.type === "Sensor inductivo" || c.type === "Foto ojo" || c.type === "Switch límite") {
      add({
        componentType: c.type,
        task: "Limpiar cara de sensor/óptica y verificar alineación/montaje.",
        method: "Limpieza",
        frequency: c.type === "Foto ojo" ? "Semanal" : "Mensual",
        acceptance: "Sin overspray; bracket firme; detección estable.",
        rationale: "Falsos triggers por contaminación y desalineación.",
      });
      add({
        componentType: c.type,
        task: "Prueba funcional: verificar cambio de señal (LED/entrada PLC) durante operación.",
        method: "Prueba funcional",
        frequency: "Trimestral",
        acceptance: "Sin chatter; respuesta consistente.",
        rationale: "Detecta cable fatigado, distancia marginal, sensor débil.",
      });
    }

    if (c.type === "Rodamiento") {
      add({
        componentType: c.type,
        task: "Inspección: ruido/temperatura/juego; buscar fuga en sellos.",
        method: "Visual",
        frequency: "Semanal",
        acceptance: "Sin ruido anormal; temp normal; sin juego excesivo.",
        rationale: "Detección temprana evita gripado y daño mayor.",
      });
      add({
        componentType: c.type,
        task: "Lubricación según estándar (si aplica) y verificar grasa correcta.",
        method: "Lubricación",
        frequency: "Por condición",
        acceptance: "Sin sobre-engrase; grasa limpia; tipo correcto.",
        rationale: "La lubricación correcta define vida del rodamiento.",
      });
    }

    if (c.type === "Filtro de aire" || c.type === "Manómetro / ΔP") {
      add({
        componentType: c.type,
        task: "Verificar condición del filtro y/o registrar ΔP; reemplazar por condición.",
        method: "Medición",
        frequency: "Mensual",
        acceptance: "ΔP en rango o condición aceptable; sin bypass.",
        rationale: "ΔP es el mejor indicador para reemplazo y protege ventiladores/proceso.",
      });
    }
  }

  // Dedup simple
  const seen = new Set<string>();
  return out.filter((t) => {
    const k = `${t.componentType}|${t.task}|${t.method}|${t.frequency}|${t.role}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export default function Page() {
  type Step = 0 | 1 | 2 | 3 | 4;
  const [step, setStep] = useState<Step>(0);

  const [asset, setAsset] = useState({
    nombre: "",
    area: "",
    tipo: "Horno / Casa de aire",
    criticidad: "A" as Criticidad,
    flags: Object.fromEntries(allFlags.map((f) => [f, false])) as Record<EnvFlag, boolean>,
  });

  const [subsystems, setSubsystems] = useState<Record<Subsystem, boolean>>(() => {
    const d = subsystemDefaults["Horno / Casa de aire"];
    const all: Subsystem[] = ["Control", "Drives / Motion", "Motores", "Instrumentación", "Mecánico", "Neumático", "Proceso", "Seguridad"];
    return Object.fromEntries(all.map((s) => [s, d.includes(s)])) as Record<Subsystem, boolean>;
  });

  const enabledSubsystems = useMemo(
    () => (Object.keys(subsystems) as Subsystem[]).filter((s) => subsystems[s]),
    [subsystems]
  );

  const [components, setComponents] = useState<Component[]>([]);

  const pm = useMemo(() => generatePM(asset.criticidad, asset.flags, components.filter((c) => enabledSubsystems.includes(c.subsystem))), [asset, components, enabledSubsystems]);

  const next = () => setStep((s) => Math.min(4, (s + 1) as Step) as Step);
  const back = () => setStep((s) => Math.max(0, (s - 1) as Step) as Step);

  const setTipo = (tipo: string) => {
    setAsset((a) => ({ ...a, tipo }));
    const d = subsystemDefaults[tipo] || subsystemDefaults["Horno / Casa de aire"];
    const all: Subsystem[] = ["Control", "Drives / Motion", "Motores", "Instrumentación", "Mecánico", "Neumático", "Proceso", "Seguridad"];
    setSubsystems(Object.fromEntries(all.map((s) => [s, d.includes(s)])) as Record<Subsystem, boolean>);
  };

  const addComponent = (type: ComponentType, subsystem: Subsystem) => {
    setComponents((cs) => [{ id: uid(), subsystem, type, qty: 1 }, ...cs]);
  };

  const updateComponent = (id: string, patch: Partial<Component>) => {
    setComponents((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeComponent = (id: string) => {
    setComponents((cs) => cs.filter((c) => c.id !== id));
  };

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 20, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>PM Creator — Wizard (MVP)</h1>
      <p style={{ color: "#666", marginTop: 6 }}>
        Flujo: Sistema → Subsistemas → Componentes → Contexto → Output (SAP PM listo).
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        {["1) Sistema", "2) Subsistemas", "3) Componentes", "4) Contexto", "5) Output"].map((t, i) => (
          <button
            key={t}
            onClick={() => setStep(i as Step)}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #ddd",
              background: step === i ? "#111" : "#fff",
              color: step === i ? "#fff" : "#111",
              cursor: "pointer",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <button onClick={back} disabled={step === 0} style={{ padding: "8px 12px", borderRadius: 10 }}>
          Atrás
        </button>
        <button onClick={next} disabled={step === 4} style={{ padding: "8px 12px", borderRadius: 10 }}>
          Siguiente
        </button>
      </div>

      {step === 0 && (
        <section style={{ marginTop: 20, padding: 16, border: "1px solid #eee", borderRadius: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>1) Sistema</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: "#555" }}>Nombre del sistema/asset</div>
              <input value={asset.nombre} onChange={(e) => setAsset((a) => ({ ...a, nombre: e.target.value }))} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }} placeholder="Ej: TOP COAT OVEN FRESH AIR" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#555" }}>Área</div>
              <input value={asset.area} onChange={(e) => setAsset((a) => ({ ...a, area: e.target.value }))} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }} placeholder="Ej: Paint 2" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#555" }}>Criticidad</div>
              <select value={asset.criticidad} onChange={(e) => setAsset((a) => ({ ...a, criticidad: e.target.value as Criticidad }))} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}>
                <option value="A">A (Alta)</option>
                <option value="B">B</option>
                <option value="C">C (Baja)</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "#555" }}>Tipo de sistema</div>
            <select value={asset.tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}>
              {Object.keys(subsystemDefaults).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
              Subsistemas sugeridos: {(subsystemDefaults[asset.tipo] || subsystemDefaults["Horno / Casa de aire"]).join(", ")}
            </div>
          </div>
        </section>
      )}

      {step === 1 && (
        <section style={{ marginTop: 20, padding: 16, border: "1px solid #eee", borderRadius: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>2) Subsistemas</h2>
          <p style={{ color: "#666", marginTop: 6 }}>Activa solo lo que existe en el equipo.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 12 }}>
            {(Object.keys(subsystems) as Subsystem[]).map((s) => (
              <button
                key={s}
                onClick={() => setSubsystems((m) => ({ ...m, [s]: !m[s] }))}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid #ddd",
                  textAlign: "left",
                  background: subsystems[s] ? "#f2f2f2" : "#fff",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 800 }}>{s}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>{subsystems[s] ? "Activo" : "Inactivo"}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section style={{ marginTop: 20, padding: 16, border: "1px solid #eee", borderRadius: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>3) Componentes</h2>
          <p style={{ color: "#666", marginTop: 6 }}>Agrega por tipo funcional. Después lo conectamos a Spare Parts DB.</p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {quickAdd
              .filter((q) => enabledSubsystems.includes(q.subsystem))
              .map((q) => (
                <button key={q.label} onClick={() => addComponent(q.type, q.subsystem)} style={{ padding: "8px 10px", borderRadius: 999, border: "1px solid #ddd", cursor: "pointer" }}>
                  + {q.label}
                </button>
              ))}
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {components
              .filter((c) => enabledSubsystems.includes(c.subsystem))
              .map((c) => (
                <div key={c.id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>
                      {c.type} <span style={{ color: "#666", fontWeight: 600 }}>— {c.subsystem}</span>
                    </div>
                    <button onClick={() => removeComponent(c.id)} style={{ padding: "6px 10px", borderRadius: 10 }}>
                      Quitar
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#555" }}>Qty</div>
                      <input
                        type="number"
                        value={c.qty}
                        onChange={(e) => updateComponent(c.id, { qty: Number(e.target.value || 1) })}
                        style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#555" }}>Fabricante</div>
                      <input value={c.manufacturer || ""} onChange={(e) => updateComponent(c.id, { manufacturer: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }} placeholder="Siemens, AB, WEG..." />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#555" }}>Modelo</div>
                      <input value={c.model || ""} onChange={(e) => updateComponent(c.id, { model: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }} placeholder="S7-1500, FR-E800..." />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#555" }}>Notas</div>
                      <input value={c.notes || ""} onChange={(e) => updateComponent(c.id, { notes: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }} placeholder="Opcional" />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section style={{ marginTop: 20, padding: 16, border: "1px solid #eee", borderRadius: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>4) Contexto</h2>
          <p style={{ color: "#666", marginTop: 6 }}>Estos flags ajustan frecuencias y agregan checks.</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            {allFlags.map((f) => (
              <label key={f} style={{ display: "flex", gap: 10, alignItems: "center", padding: 12, border: "1px solid #eee", borderRadius: 14 }}>
                <input
                  type="checkbox"
                  checked={asset.flags[f]}
                  onChange={(e) => setAsset((a) => ({ ...a, flags: { ...a.flags, [f]: e.target.checked } }))}
                />
                <div>
                  <div style={{ fontWeight: 800 }}>{f}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>Afecta frecuencias/recomendaciones.</div>
                </div>
              </label>
            ))}
          </div>
        </section>
      )}

      {step === 4 && (
        <section style={{ marginTop: 20, padding: 16, border: "1px solid #eee", borderRadius: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>5) Output (SAP PM listo)</h2>
          <p style={{ color: "#666", marginTop: 6 }}>
            Aquí sale la lista de tareas + frecuencia + método + criterio + rol + racional.
          </p>

          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>
                  {["Componente", "Tarea", "Frecuencia", "Método", "Criterio de aceptación", "Rol", "Racional"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pm.map((t, i) => (
                  <tr key={i}>
                    <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{t.componentType}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{t.task}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{t.frequency}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{t.method}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{t.acceptance}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{t.role}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0", color: "#666" }}>{t.rationale}</td>
                  </tr>
                ))}
                {pm.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 14, color: "#666" }}>
                      Agrega componentes para generar tareas.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
