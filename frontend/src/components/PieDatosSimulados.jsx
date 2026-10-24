// Etiqueta de procedencia de los datos (BRIEF §8): "Datos simulados" mientras la base sea la simulada;
// con las ventas de la empresa sembradas indica que son reales y anonimizadas. La fuente la fija seed.py
// en configuracion.fuente_datos y se lee de GET /api/admin/config.
import { useTienda } from "../lib/tienda";

export default function PieDatosSimulados() {
  const { config } = useTienda();
  const reales = config?.fuente_datos === "empresa";
  return (
    <div className="w-full bg-primary-container text-surface-container-lowest text-xs py-2 px-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-center">
      <span className="material-symbols-outlined text-sm text-secondary-fixed-dim">{reales ? "verified" : "science"}</span>
      <span className="font-semibold tracking-wide">{reales ? "Datos reales anonimizados" : "Datos simulados"}</span>
      <span className="text-on-primary-container min-w-0">
        {reales
          ? "· Prototipo de tesis UPN 2026 · ventas de la empresa (ene–jul 2026); clientes identificados solo por código anónimo"
          : "· Prototipo de tesis UPN 2026 · los productos, ventas y clientes no son reales"}
      </span>
    </div>
  );
}
