import { Initiative, ScheduledInitiative, ClosedDay } from '../types';
import { format, eachDayOfInterval, parseISO, isWeekend } from 'date-fns';
import { es } from 'date-fns/locale';
import * as Icons from 'lucide-react';
import { CheckCircle, TrendingUp, TrendingDown, Minus, Calendar, Clock } from 'lucide-react';

interface ClosedInitiativesProps {
  initiatives: Initiative[];
  scheduledInitiatives: ScheduledInitiative[];
  closedDays: ClosedDay[];
}

export function ClosedInitiatives({ 
  initiatives, 
  scheduledInitiatives, 
  closedDays 
}: ClosedInitiativesProps) {
  // Filtrar solo iniciativas cerradas
  const closedInitiatives = initiatives.filter(i => !!i.closedAt);

  if (closedInitiatives.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay iniciativas finalizadas</h3>
          <p className="text-sm text-gray-500">
            Las iniciativas finalizadas aparecerán aquí con su resumen completo
          </p>
        </div>
      </div>
    );
  }

  // Ordenar por fecha de cierre (más reciente primero)
  const sortedClosedInitiatives = [...closedInitiatives].sort((a, b) => {
    const dateA = a.closedAt ? new Date(a.closedAt).getTime() : 0;
    const dateB = b.closedAt ? new Date(b.closedAt).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Iniciativas Finalizadas</h2>
          <p className="text-sm text-gray-600">
            {closedInitiatives.length} iniciativa{closedInitiatives.length !== 1 ? 's' : ''} completada{closedInitiatives.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedClosedInitiatives.map((initiative) => {
            const IconComponent = initiative.icon 
              ? (Icons[initiative.icon as keyof typeof Icons] as React.ComponentType<{ className?: string; style?: React.CSSProperties }>)
              : null;

            // Calcular métricas
            const scheduled = scheduledInitiatives.filter(s => s.initiativeId === initiative.id);
            
            // Horas planificadas totales
            const totalPlanned = scheduled.reduce((total, s) => {
              return total + Object.values(s.hoursPerDay).reduce((sum, hours) => sum + hours, 0);
            }, 0);

            // Horas consumidas (solo días cerrados)
            const totalConsumed = closedDays.reduce((total, cd) => {
              return total + (cd.consumedHours[initiative.id] || 0);
            }, 0);

            // Horas estimadas
            const estimated = initiative.estimatedHours || 0;

            // Horas pendientes (planificadas pero no consumidas)
            const totalPending = totalPlanned - totalConsumed;

            // Variación (consumido vs estimado)
            const variance = estimated > 0 ? totalConsumed - estimated : 0;
            const variancePercent = estimated > 0 ? (variance / estimated) * 100 : 0;

            // Determinar estado de eficiencia
            let efficiencyIcon = <Minus className="w-5 h-5 text-blue-500" />;
            let efficiencyText = 'Sin estimación';
            let efficiencyColor = 'text-blue-600';
            let efficiencyBg = 'bg-blue-50';

            if (estimated > 0) {
              if (Math.abs(variance) <= estimated * 0.1) {
                efficiencyIcon = <CheckCircle className="w-5 h-5 text-green-500" />;
                efficiencyText = 'Dentro del objetivo';
                efficiencyColor = 'text-green-600';
                efficiencyBg = 'bg-green-50';
              } else if (variance > 0) {
                efficiencyIcon = <TrendingUp className="w-5 h-5 text-orange-500" />;
                efficiencyText = 'Sobre estimación';
                efficiencyColor = 'text-orange-600';
                efficiencyBg = 'bg-orange-50';
              } else {
                efficiencyIcon = <TrendingDown className="w-5 h-5 text-green-500" />;
                efficiencyText = 'Bajo estimación';
                efficiencyColor = 'text-green-600';
                efficiencyBg = 'bg-green-50';
              }
            }

            // Contar días trabajados
            const daysWorked = closedDays.filter(cd => (cd.consumedHours[initiative.id] || 0) > 0).length;

            // Calcular progreso visual
            const maxValue = Math.max(estimated, totalConsumed, 1);
            const estimatedWidth = estimated > 0 ? (estimated / maxValue) * 100 : 0;
            const consumedWidth = (totalConsumed / maxValue) * 100;

            return (
              <div 
                key={initiative.id}
                className="bg-white rounded-lg border-2 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                style={{ borderColor: initiative.color }}
              >
                {/* Header */}
                <div 
                  className="p-4 border-b"
                  style={{ backgroundColor: initiative.color + '10' }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {IconComponent && (
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: initiative.color + '30' }}
                      >
                        <IconComponent className="w-5 h-5" style={{ color: initiative.color }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{initiative.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>
                          Finalizada el {initiative.closedAt ? format(new Date(initiative.closedAt), "d 'de' MMMM, yyyy", { locale: es }) : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estadísticas principales */}
                <div className="p-4 space-y-4">
                  {/* Barra comparativa */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Horas</span>
                      <div className="text-right">
                        {estimated > 0 && (
                          <div className="text-xs text-gray-500">
                            Estimado: <span className="font-semibold">{estimated}h</span>
                          </div>
                        )}
                        <div className="text-sm font-bold" style={{ color: initiative.color }}>
                          Consumido: {totalConsumed}h
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                      {/* Barra de estimado (fondo) */}
                      {estimated > 0 && (
                        <div 
                          className="absolute h-full opacity-30"
                          style={{ 
                            backgroundColor: initiative.color,
                            width: `${estimatedWidth}%`,
                          }}
                        />
                      )}
                      
                      {/* Barra de consumido */}
                      <div 
                        className="absolute h-full flex items-center justify-end px-2"
                        style={{ 
                          backgroundColor: initiative.color,
                          width: `${consumedWidth}%`,
                        }}
                      >
                        {totalConsumed > 0 && (
                          <span className="text-xs font-bold text-white">
                            {totalConsumed}h
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Variación */}
                    {estimated > 0 && variance !== 0 && (
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className={`text-xs font-medium ${variance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {variance > 0 ? '+' : ''}{variance.toFixed(1)}h ({variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(0)}%)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Grid de métricas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">Planificado</span>
                      </div>
                      <div className="text-xl font-bold text-gray-800">{totalPlanned}h</div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs">Días trabajados</span>
                      </div>
                      <div className="text-xl font-bold text-gray-800">{daysWorked}</div>
                    </div>

                    {totalPending > 0 && (
                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-orange-600 mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs">Pendiente</span>
                        </div>
                        <div className="text-xl font-bold text-orange-700">{totalPending}h</div>
                      </div>
                    )}

                    {scheduled.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <span className="text-xs">Programaciones</span>
                        </div>
                        <div className="text-xl font-bold text-gray-800">{scheduled.length}</div>
                      </div>
                    )}
                  </div>

                  {/* Estado de eficiencia */}
                  <div 
                    className={`${efficiencyBg} border-2 rounded-lg p-3 flex items-center gap-3`}
                    style={{ borderColor: initiative.color + '40' }}
                  >
                    {efficiencyIcon}
                    <div className="flex-1">
                      <div className={`font-semibold ${efficiencyColor}`}>{efficiencyText}</div>
                      {estimated > 0 && (
                        <div className="text-xs text-gray-600 mt-0.5">
                          Variación: {variance > 0 ? '+' : ''}{variance.toFixed(1)}h respecto a estimado
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
