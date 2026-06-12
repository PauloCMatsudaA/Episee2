import clsx from 'clsx';

const tamanhos = {
  p: { classe: 'h-4 w-4', borda: '2px'  },
  m: { classe: 'h-8 w-8', borda: '3px'  },
  g: { classe: 'h-12 w-12', borda: '4px' },
};

export default function Carregando({ tamanho = 'm', className = '' }) {
  const t = tamanhos[tamanho] || tamanhos.m;
  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <div
        className={clsx('animate-spin rounded-full border-brand border-t-transparent', t.classe)}
        style={{ borderWidth: t.borda }}
      />
    </div>
  );
}

export function PaginaCarregando() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <Carregando tamanho="g" />
        <p className="mt-4 text-sm text-slate-400">Carregando...</p>
      </div>
    </div>
  );
}
