// Utilidades compartidas del panel de administración.

// Evento de ventana que emiten las páginas cuando cambian la configuración (modo activo)
export const EVENTO_CONFIG = 'ferremax:config-actualizada';
export const avisarConfig = (config) => window.dispatchEvent(new CustomEvent(EVENTO_CONFIG, { detail: config }));

// Mensaje legible a partir de un error de axios
export const mensajeError = (err) => {
  const d = err?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x) => x.msg).join('; ');
  return err?.message || 'Error desconocido';
};
