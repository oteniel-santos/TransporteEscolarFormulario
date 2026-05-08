import { useState, useEffect } from "react";
import { Errors } from "@/types/cadastro";

export function useGeolocalizacao() {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [erro, setErro] = useState<Errors>({});
  const [tentouAutomatico, setTentouAutomatico] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const obterLocalizacao = (automatico = false) => {
    if (automatico) setTentouAutomatico(true);
    setCarregando(true);
    if (!navigator.geolocation) {
      setErro((e) => ({
        ...e,
        localizacao: "Geolocalização não é suportada pelo seu navegador",
      }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setErro((e) => ({ ...e, localizacao: undefined }));
        setCarregando(false);
      },
      () => {
        setErro((e) => ({
          ...e,
          localizacao: "Permissão negada para obter a localização",
        }));
        setCarregando(false);
      },
    );
  };

  useEffect(() => {
    obterLocalizacao(true);
  }, []);

  const atualizarPosicaoManual = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  return {
    latitude,
    longitude,
    erro,
    atualizarPosicaoManual,
    obterLocalizacao,
    localizacaoErro: erro.localizacao,
    tentouAutomatico,
    carregando,
  };
}
