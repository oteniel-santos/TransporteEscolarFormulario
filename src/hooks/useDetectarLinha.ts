import { LINHAS } from "@/constants/linhas";
import { carregarGPX, distanciaMetros } from "@/lib/gpx";
import { ResultadoLinha } from "@/types/cadastro";

export function useDetectarLinha() {
  async function detectarLinhaPorGPX(
    latitude: number,
    longitude: number,
  ): Promise<ResultadoLinha | null> {
    for (const linha of LINHAS) {
      if (!linha.arquivoGPX) continue;
      const pontos = await carregarGPX(linha.arquivoGPX, linha.id);
      // Usar um raio padrão de 500 metros já que LINHAS não tem raioMetros
      const raioMetros = 500;
      for (const ponto of pontos) {
        const distancia = distanciaMetros(
          latitude,
          longitude,
          ponto.lat,
          ponto.lng,
        );
        if (distancia <= raioMetros) {
          return {
            linhaId: linha.id.toString(),
            linhaNome: linha.nome,
            pontoUsado: { lat: ponto.lat, lng: ponto.lng, distancia },
          };
        }
      }
    }
    return null;
  }
  return { detectarLinhaPorGPX };
}
