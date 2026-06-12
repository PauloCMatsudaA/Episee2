import clsx from 'clsx';

const configStatus = {
  ok:        { rotulo: 'Conforme',      fundo: 'bg-green-50',  texto: 'text-green-700',  ponto: 'bg-ok'        },
  err:       { rotulo: 'Não Conforme',  fundo: 'bg-red-50',    texto: 'text-red-700',    ponto: 'bg-err'       },
  pendente:  { rotulo: 'Pendente',      fundo: 'bg-yellow-50', texto: 'text-yellow-700', ponto: 'bg-warn'      },
  aprovado:  { rotulo: 'Aprovado',      fundo: 'bg-green-50',  texto: 'text-green-700',  ponto: 'bg-ok'        },
  rejeitado: { rotulo: 'Rejeitado',     fundo: 'bg-red-50',    texto: 'text-red-700',    ponto: 'bg-err'       },
  ativo:     { rotulo: 'Ativo',         fundo: 'bg-green-50',  texto: 'text-green-700',  ponto: 'bg-ok'        },
  inativo:   { rotulo: 'Inativo',       fundo: 'bg-slate-50',  texto: 'text-slate-500',  ponto: 'bg-slate-400' },
};

export default function BadgeStatus({ status, tamanho = 'sm' }) {
  const config = configStatus[status] || configStatus.pendente;

  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      config.fundo,
      config.texto,
      tamanho === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
    )}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', config.ponto)} />
      {config.rotulo}
    </span>
  );
}
