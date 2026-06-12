import { TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';

const mapaCores = {
  laranja: { fundo: 'bg-orange-50', icone: 'text-brand',    borda: 'border-orange-100' },
  verde:   { fundo: 'bg-green-50',  icone: 'text-ok',       borda: 'border-green-100'  },
  vermelho:{ fundo: 'bg-red-50',    icone: 'text-err',      borda: 'border-red-100'    },
  amarelo: { fundo: 'bg-yellow-50', icone: 'text-warn',     borda: 'border-yellow-100' },
  azul:    { fundo: 'bg-blue-50',   icone: 'text-blue-500', borda: 'border-blue-100'   },
  // aliases em inglês para compatibilidade com páginas existentes
  orange:  { fundo: 'bg-orange-50', icone: 'text-brand',    borda: 'border-orange-100' },
  green:   { fundo: 'bg-green-50',  icone: 'text-ok',       borda: 'border-green-100'  },
  red:     { fundo: 'bg-red-50',    icone: 'text-err',      borda: 'border-red-100'    },
  yellow:  { fundo: 'bg-yellow-50', icone: 'text-warn',     borda: 'border-yellow-100' },
};

export default function CartaoEstatistica({ titulo, valor, icone: Icone, tendencia, cor = 'laranja' }) {
  const cores      = mapaCores[cor] || mapaCores.laranja;
  const positivo   = tendencia > 0;
  const temTendencia = tendencia !== undefined && tendencia !== null;

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{titulo}</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{valor}</p>

          {temTendencia && (
            <div className="mt-2 flex items-center gap-1">
              {positivo
                ? <TrendingUp  size={14} className="text-ok"  />
                : <TrendingDown size={14} className="text-err" />
              }
              <span className={clsx('text-xs font-medium', positivo ? 'text-ok' : 'text-err')}>
                {positivo ? '+' : ''}{tendencia}%
              </span>
              <span className="text-xs text-slate-400">vs. semana anterior</span>
            </div>
          )}
        </div>

        <div className={clsx('rounded-xl p-3', cores.fundo)}>
          {Icone && <Icone size={24} className={cores.icone} />}
        </div>
      </div>
    </div>
  );
}
