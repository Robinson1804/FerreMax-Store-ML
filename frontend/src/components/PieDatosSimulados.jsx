// Etiqueta obligatoria (BRIEF §8) mientras la base sea la simulada.
export default function PieDatosSimulados() {
  return (
    <div className="w-full bg-primary-container text-surface-container-lowest text-xs py-2 px-4 flex items-center justify-center gap-2">
      <span className="material-symbols-outlined text-sm text-secondary-fixed-dim">science</span>
      <span className="font-semibold tracking-wide">Datos simulados</span>
      <span className="text-on-primary-container">· Prototipo de tesis UPN 2026 · los productos, ventas y clientes no son reales</span>
    </div>
  );
}
