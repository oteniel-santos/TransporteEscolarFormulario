export type Filho = {
  nome: string;
  escolaId: number | "";
  escolaNome: string;
  turma: string;
  turno: string;
};

export type Errors = {
  responsavel?: string;
  nucleo?: string;
  turno?: string;
  linha?: string;
  localizacao?: string;
  endereco?: string;
  filhos?: {
    nome?: string;
    escola?: string;
    turma?: string;
    turno?: string;
  }[];
};

export type ResultadoLinha = {
  linhaId: string;
  linhaNome: string;
  pontoUsado: {
    lat: number;
    lng: number;
    distancia: number;
  };
};

export type Linha = {
  id: number;
  nome: string;
  motorista: string;
  telefone: string;
  arquivoGPX: string;
  nucleoId: number;
  turno: string;
};

export type Escola = {
  id: number;
  nome: string;
  nucleoId: number;
  etapas: string[];
};

export type LinhaGPX = {
  id: number;
  nome: string;
  arquivo: string;
  raioMetros: number;
};
