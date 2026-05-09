export type Filho = {
  nome: string;
  escolaId: number | "";
  escolaNome: string;
  turma: string;
};

export type Errors = {
  responsavel?: string;
  linha?: string;
  localizacao?: string;
  endereco?: string;
  filhos?: {
    nome?: string;
    escola?: string;
    turma?: string;
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
};

export type Escola = {
  id: number;
  nome: string;
};

export type LinhaGPX = {
  id: number;
  nome: string;
  arquivo: string;
  raioMetros: number;
};
