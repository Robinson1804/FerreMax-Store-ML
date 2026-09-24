// Texto del modo activo leído de /api/admin/config ("Machine Learning" o "Convencional").
import { useTienda } from "../lib/tienda";

export default function EtiquetaModo({ prefijo = "Modo: " }) {
  const { modoTexto } = useTienda();
  return <>{prefijo}{modoTexto}</>;
}
