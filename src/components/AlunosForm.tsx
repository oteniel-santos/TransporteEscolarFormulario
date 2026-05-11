"use client";
import { Filho } from "@/types/cadastro";
import { ESCOLAS, selecionarTurmas } from "@/constants/escolas";
import { Dispatch, SetStateAction, useMemo } from "react";
import { InputFloating } from "./InputFloating";

type AlunosFormProps = {
  filhos: Filho[];
  setFilhos: Dispatch<SetStateAction<Filho[]>>;
  errors: any;
  limparErroFilho: (index: number, campo: keyof Filho) => void;
  nucleoId: number | "";
};

export default function AlunosForm({
  filhos,
  setFilhos,
  errors,
  limparErroFilho,
  nucleoId,
}: AlunosFormProps) {
  const adicionarFilho = () => {
    setFilhos([
      ...filhos,
      { nome: "", escolaId: "", escolaNome: "", turma: "" },
    ]);
  };
  const removerFilho = (index: number) => {
    setFilhos(filhos.filter((_, i) => i !== index));
  };
  const atualizarFilho = (index: number, campo: keyof Filho, valor: any) => {
    const novaLista = [...filhos];
    novaLista[index] = { ...novaLista[index], [campo]: valor };
    setFilhos(novaLista);
  };

  const escolasFiltradas = useMemo(() => {
    if (!nucleoId) return [];
    return ESCOLAS.filter((e) => e.nucleoId === Number(nucleoId));
  }, [nucleoId]);

  return (
    <div className="space-y-4 mt-4">
      {filhos.map((filho, index) => (
        <div
          key={index}
          className="relative border border-gray-200 bg-white rounded-lg p-4 shadow-sm pt-8"
        >
          <div id={`field-aluno-${index}-nome`}>
            <InputFloating
              label="Nome do Aluno"
              value={filho.nome}
              error={errors?.filhos?.[index]?.nome}
              onChange={(e) => {
                atualizarFilho(index, "nome", e.target.value);
                limparErroFilho(index, "nome");
              }}
            />
          </div>

          <div id={`field-aluno-${index}-escola`} className="mt-4">
            <select
              disabled={!nucleoId}
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
                     ${errors?.filhos?.[index]?.escola ? "border-red-500" : ""} `}
              value={filho.escolaId}
              onChange={(e) =>
                atualizarFilho(index, "escolaId", Number(e.target.value))
              }
            >
              <option value="">{nucleoId ? "Selecione a escola" : "Selecione um núcleo primeiro"}</option>
              {escolasFiltradas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
            {errors?.filhos?.[index]?.escola && (
              <p className="text-xs text-red-600 mt-1">
                {errors.filhos[index].escola}
              </p>
            )}
          </div>

          <div id={`field-aluno-${index}-turma`} className="mt-4">
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
                     ${errors?.filhos?.[index]?.turma ? "border-red-500" : ""} `}
              disabled={!filho.escolaId}
              value={filho.turma}
              onChange={(e) => atualizarFilho(index, "turma", e.target.value)}
            >
              <option value="">
                {filho.escolaId
                  ? "Selecione a Série"
                  : "Selecione a escola primeiro"}
              </option>
              {filho.escolaId &&
                selecionarTurmas(filho.escolaId).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
            </select>
            {errors?.filhos?.[index]?.turma && (
              <p className="text-xs text-red-600 mt-1">
                {errors.filhos[index].turma}
              </p>
            )}
          </div>
          {filhos.length > 1 && (
            <button
              type="button"
              onClick={() => removerFilho(index)}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            >
              <span className="sr-only">Remover aluno </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 8.586l4.95-4.95a1 1 0 111.414 1.414L11.414 10l4.95 4.95a1 1 0 01-1.414 1.414L10 11.414l-4.95 4.95a1 1 0 01-1.414-1.414L8.586 10l-4.95-4.95A1 1 0 115.05 3.636L10 8.586z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      ))}
      <button
        onClick={adicionarFilho}
        type="button"
        className="w-full border-2 border-dotted p-3 text-blue-600 rounded"
      >
        + Adicionar aluno
      </button>
    </div>
  );
}
