"use client";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { LINHAS } from "@/constants/linhas";
import { NUCLEOS } from "@/constants/nucleos";
import { getNomeEscola } from "@/constants/escolas";
import { carregarGPX } from "@/lib/gpx";
import { Filho, Errors } from "@/types/cadastro";
import { useGeolocalizacao } from "@/hooks/useGeolocalizacao";

import SectionTitle from "./SectionTitle";
import AlunosForm from "./AlunosForm";
import { InputFloating } from "./InputFloating";

const WHATSAPP_NUMBER = "5566992028229";

const MapaLinha = dynamic(() => import("./MapaLinha"), { ssr: false });

export default function CadastroForm() {
  const [responsavel, setResponsavel] = useState("");
  const [endereco, setEndereco] = useState("");
  const [nucleo, setNucleo] = useState<number | "">("");
  const [linha, setLinha] = useState<number | "">("");
  const [turnoFiltro, setTurnoFiltro] = useState("");
  const [filhos, setFilhos] = useState<Filho[]>([
    { nome: "", escolaId: "", escolaNome: "", turma: "", turno: "" },
  ]);
  const [errors, setErrors] = useState<Errors>({});
  const [salvando, setSalvando] = useState(false);
  const [tipoMapa, setTipoMapa] = useState<"mapa" | "satelite">("mapa");
  const [rotaLinha, setRotaLinha] = useState<{ lat: number; lng: number }[]>(
    [],
  );
  const [modalAberto, setModalAberto] = useState(false);
  const {
    latitude,
    longitude,
    localizacaoErro,
    tentouAutomatico,
    carregando,
    obterLocalizacao,
    atualizarPosicaoManual,
  } = useGeolocalizacao();
  const pontoCasa = useMemo(() => {
    if (!latitude || !longitude) return undefined;
    return { lat: latitude, lng: longitude };
  }, [latitude, longitude]);

  const linhasFiltradas = useMemo(() => {
    if (!nucleo) return [];
    let filtradas = LINHAS.filter((l) => l.nucleoId === Number(nucleo));
    if (turnoFiltro) {
      filtradas = filtradas.filter((l) => l.turno === turnoFiltro);
    }
    return filtradas;
  }, [nucleo, turnoFiltro]);

  useEffect(() => {
    if (filhos[0]?.turno) {
      setTurnoFiltro(filhos[0].turno);
    } else {
      setTurnoFiltro("");
    }
  }, [filhos[0]?.turno]);

  const limparErroFilho = (index: number, campo: keyof Filho) => {
    setErrors((prev) => {
      if (!prev.filhos) return prev;
      const novosFilhos = [...prev.filhos];
      if (!novosFilhos[index]) return prev;
      novosFilhos[index] = {
        ...novosFilhos[index],
        [campo]: undefined,
      };
      return {
        ...prev,
        filhos: novosFilhos,
      };
    });
  };

  // VALIDAR FORMULÁRIO
  function validarFormulario(): boolean {
    const novosErros: Errors = { filhos: [] };

    if (!responsavel.trim()) {
      novosErros.responsavel = "Informe o nome do responsável";
    }

    if (!endereco.trim()) {
      novosErros.endereco = "Informe o endereço";
    }

    if (!nucleo) {
      novosErros.nucleo = "Selecione o núcleo";
    }

    if (!linha) {
      novosErros.linha = "Selecione a linha do transporte";
    }

    if (!latitude || !longitude) {
      //novosErros.localizacao = "Localização obrigatória";
    }

    filhos.forEach((f, i) => {
      const erroFilho: any = {};
      if (!f.nome) erroFilho.nome = "Informe o nome do aluno";
      if (!f.escolaId) erroFilho.escola = "Selecione a escola";
      if (!f.turma) erroFilho.turma = "Informe a turma";
      if (!f.turno) erroFilho.turno = "Selecione o turno";
      novosErros.filhos![i] = erroFilho;
    });

    const temErro =
      novosErros.responsavel ||
      novosErros.nucleo ||
      novosErros.linha ||
      // novosErros.localizacao ||
      novosErros.filhos!.some((f) => Object.keys(f).length > 0);

    setErrors(novosErros);
    return !temErro;
  }

  useEffect(() => {
    if (linha) {
      const config = LINHAS.find((l) => l.id === Number(linha));
      if (!config?.arquivoGPX) {
        setRotaLinha([]);
        return;
      }
      carregarGPX(config.arquivoGPX, config.id).then(setRotaLinha);
    }
  }, [linha]);

  const rolarParaPrimeiroErro = () => {
    const primeiro = document.querySelector('[class*="border-red"]');
    if (primeiro) {
      primeiro.scrollIntoView({ behavior: "smooth", block: "center" });
      (primeiro as HTMLElement).focus();
    }
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario()) {
      setTimeout(rolarParaPrimeiroErro, 100);
      return;
    }
    setSalvando(true);
    const res = await fetch("/api/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responsavel,
        endereco,
        nucleo,
        linha,
        latitude,
        longitude,
        filhos,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      const d = LINHAS.find((l) => l.id === Number(linha));
      const n = NUCLEOS.find((n) => n.id === Number(nucleo));
      const msg = `
${filhos
  .map(
    (f) => `*CADASTRO TRANSPORTE ESCOLAR 2026*
  Nome: ${f.nome.toUpperCase()}
  Escola: ${getNomeEscola(f.escolaId)}
  Serie: ${f.turma}
  Turno: ${f.turno}
  Responsável: ${responsavel.toUpperCase()}
  Endereço: ${endereco.toUpperCase()}
  Núcleo: ${n?.nome}

*LINHA*
  Linha Ônibus: ${d?.nome}
  Motorista: ${d?.motorista}
  Fone Motorista: ${d?.telefone}

*LOCALIZAÇÃO*
  Coordenadas da Casa: Lat: ${latitude ? latitude : "Não Informada"}, Long: ${longitude ? longitude : "Não Informada"}`,
  )
  .join("\n\n====================\n")}
`;
      window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    }
    setSalvando(false);
  };

  const inputStyle = (erro?: string) => ({
    border: erro ? "1px solid red" : "1px solid #ccc",
    className: `w-full rounded-md bg-white/5 px-3 py-2.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-400 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm`,
  });

  return (
    <div className="max-w-xl mx-auto p-2">
      <div className="">
        <img
          alt="Your Company"
          src="/CARD-MODELO.svg"
          className="mx-auto h-20 w-auto"
        />
        <p className="mt-2 text-center text-sm text-gray-700">
          Secretaria Municipal de Educação, Cultura, Esporte e Lazer <br />
          Novo Mundo - MT
        </p>
        <h2 className="p-2  text-center text-2xl font-bold tracking-tight text-cyan-900 rounded-4xl">
          CADASTRO TRANSPORTE ESCOLAR 2026
        </h2>
        <p className="text-center text-sm/6 text-gray-400 border-b-2 border-b-cyan-700">
          Preencha seus dados para realizar seu cadastro no Transporte Escolar
        </p>
      </div>

      <form onSubmit={enviar} className="space-y-6 mt-6">
        <SectionTitle number={1} title="Responsável" />

        <div id="field-responsavel" className="space-y-1 relative">
          <InputFloating
            label="Nome do Responsável"
            value={responsavel}
            error={errors.responsavel}
            onChange={(e) => {
              setResponsavel(e.target.value);
              setErrors((prev) => ({ ...prev, responsavel: undefined }));
            }}
          />
        </div>
        <div id="field-endereco">
          <InputFloating
            label="Endereço (nome da Fazenda, Sitio ou Chácara)"
            value={endereco}
            error={errors.endereco}
            onChange={(e) => {
              setEndereco(e.target.value);
              setErrors((prev) => ({ ...prev, endereco: undefined }));
            }}
          />
        </div>

        <div id="field-nucleo">
          <select
            className={`
              block w-full
              rounded-md border
              px-3
              py-4
              text-base
              bg-white/5
              text-gray-600
              border-gray-300
              -outline-offset-1
              placeholder:text-gray-500
              focus:outline-2
              focus:-outline-offset-2
              focus:outline-indigo-500
              sm:text-sm/6
              ${errors.nucleo ? "border border-red-500" : ""}`}
            value={nucleo}
            onChange={(e) => {
              setNucleo(Number(e.target.value));
              setLinha("");
              setFilhos(
                filhos.map((f) => ({
                  ...f,
                  escolaId: "",
                  escolaNome: "",
                  turma: "",
                  turno: "",
                })),
              );
              setErrors((prev) => ({ ...prev, nucleo: undefined }));
            }}
          >
            <option value="">Selecione um núcleo</option>
            {NUCLEOS.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nome}
              </option>
            ))}
          </select>
          {errors.nucleo && (
            <p className="text-red-500 text-xs leading-tight">
              {errors.nucleo}
            </p>
          )}
        </div>


        <div id="field-alunos" className="pt-8 ">
          <SectionTitle number={2} title="Alunos" />
          <AlunosForm
            nucleoId={nucleo}
            filhos={filhos}
            setFilhos={setFilhos}
            errors={errors}
            limparErroFilho={limparErroFilho}
          />
        </div>

        <SectionTitle number={3} title="Linha" />
        <div id="field-linha">
          <select
            name="linhas"
            disabled={!nucleo}
            className={`
                      block w-full 
                      rounded-md border 
                      px-3 
                      py-4 
                      text-base
                      bg-white/5
                      text-gray-600 
                     border-gray-500
                      -outline-offset-1
                      placeholder:text-gray-500
                      focus:outline-2 
                      focus:-outline-offset-2
                      focus:outline-indigo-500 
                      sm:text-sm 
                      ${errors.linha ? "border border-red-500" : ""}`}
            value={linha}
            onChange={(e) => setLinha(Number(e.target.value))}
          >
            <option value="">
              {nucleo ? "Selecione uma linha" : "Selecione um núcleo primeiro"}
            </option>
            {linhasFiltradas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome} - Motorista: {l.motorista}
              </option>
            ))}
          </select>

          {errors.linha && (
            <p className="text-red-500 text-xs leading-tight">{errors.linha}</p>
          )}
        </div>

        <div>
          <div className="h-96 border rounded flex items-center justify-center bg-gray-50 text-gray-600 text-sm relative overflow-hidden">
            {localizacaoErro ? (
              <div>
                <p className="text-center px-4">
                  🚫 A localização está bloqueada no navegador.
                  <br />
                  Clique no ícone de cadeado na barra de endereço e permita o
                  acesso.
                </p>

                <button
                  type="button"
                  onClick={() => obterLocalizacao(false)}
                  disabled={carregando}
                  className="w-full border-0 bg-yellow-300 p-2 rounded text-sm text-gray-900 hover:bg-yellow-400 mt-4 font-bold"
                >
                  {carregando
                    ? "Carregando localização..."
                    : " Tentar usar minha localização novamente"}
                </button>
              </div>
            ) : pontoCasa ? (
              <MapaLinha
                rota={rotaLinha}
                pontoCasa={pontoCasa}
                tipoMapa={tipoMapa}
                atualizarPosicaoManual={atualizarPosicaoManual}
              />
            ) : (
              <p className="text-center px-4">
                Obtendo localização automaticamente…
              </p>
            )}
          </div>
        </div>

        <p className="text-xs leading-5 text-slate-500">
          O marcado azul indica a posição da sua casa. Caso ela esteja
          incorreta, arraste o marcador azul para o local exato de onde você
          mora. Utilize a visão de satélite para facilitar sua visualização.
        </p>

        {/* BOTÕES DE CONTROLE DO MAPA */}
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={() => setTipoMapa("mapa")}
            className={`px-4 py-1 rounded border text-sm ${
              tipoMapa === "mapa"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700"
            }`}
          >
            🗺️ Mapa
          </button>

          <button
            type="button"
            onClick={() => setTipoMapa("satelite")}
            className={`px-4 py-1 rounded border text-sm ${
              tipoMapa === "satelite"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700"
            }`}
          >
            🛰️ Satélite
          </button>
        </div>

        {latitude && longitude && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            <span>Latitude: {latitude.toFixed(6)}</span>
            {" · "}
            <span>Longitude: {longitude.toFixed(6)}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={salvando || carregando}
          className={`w-full p-3 rounded flex items-center justify-center gap-2 ${
            salvando || carregando
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
        >
          {salvando ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Enviando...
            </>
          ) : carregando ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Obtendo localização...
            </>
          ) : (
            "Enviar"
          )}
        </button>
      </form>
      <p className="mt-10 text-center text-sm/6 text-gray-400">
        Algum problema para preencher o cadastro? <br />
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá, preciso de ajuda para preencher o cadastro do transporte escolar.")}`}
          className="font-semibold text-indigo-600 hover:text-indigo-900"
        >
          Converse com o Suporte
        </a>
      </p>
    </div>


  );
}
