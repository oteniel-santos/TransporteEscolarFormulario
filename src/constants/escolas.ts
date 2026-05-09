import { Escola } from "@/types/cadastro";

export const ESCOLAS = [
  {
    id: 1,
    nome: "Escola 1",
    nucleoId: 1,
    etapas: ["Creche I", "Creche II", "Creche III", "Creche IV", "Pré I"],
  },
  {
    id: 2,
    nome: "Escola 2",
    nucleoId: 2,
    etapas: ["Pré II", "1º ano", "2º ano", "3º ano"],
  },
  {
    id: 3,
    nome: "Escola 3",
    nucleoId: 3,
    etapas: ["4º ano", "5º ano", "6º ano"],
  },
  {
    id: 4,
    nome: "Escola 4",
    nucleoId: 4,
    etapas: ["Pré I e II", "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"],
  },
  {
    id: 5,
    nome: "Escola 5",
    nucleoId: 5,
    etapas: [
      "7º Ano",
      "8º Ano",
      "9º Ano",
      "1º Ano - Ens. Médio",
      "2º Ano - Ens. Médio",
      "3º Ano - Ens. Médio",
    ],
  },
];

export function getNomeEscola(escolaId: number | ""): string {
  if (!escolaId) return "";
  const escola = ESCOLAS.find((e) => e.id === escolaId);
  return escola ? escola.nome : "";
}

export function selecionarTurmas(escolaId: number): string[] {
  const escola = ESCOLAS.find((e) => e.id === escolaId);
  return escola ? escola.etapas : [];
}
