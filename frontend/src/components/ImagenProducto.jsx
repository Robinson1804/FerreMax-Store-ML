// Foto del producto desde /img/productos/<SKU>.webp (frontend/public). Si no existe la imagen,
// muestra el ícono Material Symbols que se usaba antes, para no dejar el recuadro vacío.
import { useState } from "react";

export const rutaImagenProducto = (sku) => `/img/productos/${encodeURIComponent(sku)}.webp`;

export default function ImagenProducto({ producto, icono = "inventory_2", className = "", iconoClassName = "", iconoStyle }) {
  const [fallo, setFallo] = useState(false);
  if (!producto?.sku || fallo) {
    return (
      <span className={`material-symbols-outlined ${iconoClassName}`} style={iconoStyle} aria-hidden="true">
        {icono}
      </span>
    );
  }
  return (
    <img
      src={rutaImagenProducto(producto.sku)}
      alt={producto.nombre || producto.sku}
      loading="lazy"
      decoding="async"
      onError={() => setFallo(true)}
      // mix-blend-multiply funde el fondo gris claro de la foto con el recuadro del diseño
      className={`object-contain mix-blend-multiply ${className}`}
    />
  );
}
