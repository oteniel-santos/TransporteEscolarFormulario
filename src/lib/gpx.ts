export function distanciaMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const gpxCache: Record<number, { lat: number; lng: number }[]> = {};
let gpxMapCache: Record<number, string> | null = null;

function parseShortGpxName(arquivoGPX: string): number | null {
  const match = arquivoGPX.match(/^(\d{1,2})\.gpx$/);
  return match ? parseInt(match[1], 10) : null;
}

async function getGpxUrl(
  linhaId: number,
  arquivoGPX?: string,
): Promise<string | null> {
  if (gpxMapCache === null) {
    try {
      const res = await fetch("/api/gpx-map");
      gpxMapCache = await res.json();
    } catch {
      gpxMapCache = {};
    }
  }

  const urlFromId = gpxMapCache![linhaId];
  if (urlFromId) return urlFromId;

  if (arquivoGPX) {
    const shortId = parseShortGpxName(arquivoGPX);
    if (shortId !== null) {
      return gpxMapCache![shortId] ?? null;
    }
  }

  return null;
}

export async function carregarGPX(
  url: string,
  linhaId: number,
): Promise<{ lat: number; lng: number }[]> {
  if (!url && !linhaId) return [];
  if (gpxCache[linhaId]) return gpxCache[linhaId];
  const resolvedUrl = (await getGpxUrl(linhaId, url)) || url;
  if (!resolvedUrl) return [];
  try {
    const response = await fetch(resolvedUrl);
    const texto = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(texto, "text/xml");
    const pontos = Array.from(xml.getElementsByTagName("trkpt")).map((pt) => ({
      lat: parseFloat(pt.getAttribute("lat") || "0"),
      lng: parseFloat(pt.getAttribute("lon") || "0"),
    }));
    gpxCache[linhaId] = pontos;
    return pontos;
  } catch (error) {
    console.error("Erro ao carregar GPX:", error);
    return [];
  }
}
