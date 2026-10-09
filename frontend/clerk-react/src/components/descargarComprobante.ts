// Descarga el PDF del comprobante de una transferencia. Lo usan Historial y el recibo de Transferir.
// Tira un error si el backend no lo pudo generar; cada pantalla decide cómo mostrarlo.
const API_URL = 'http://localhost:3000';

export async function descargarComprobante(transaccionId: string, token: string | null) {
  const res = await fetch(`${API_URL}/api/comprobantes/${encodeURIComponent(transaccionId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('No se pudo generar el comprobante');

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `comprobante-404bank-${transaccionId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
