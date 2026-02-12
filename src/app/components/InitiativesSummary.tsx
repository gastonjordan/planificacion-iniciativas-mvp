import { Initiative, ScheduledInitiative, ClosedDay } from '../types';
import * as Icons from 'lucide-react';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface InitiativesSummaryProps {
  initiatives: Initiative[];
  scheduledInitiatives: ScheduledInitiative[];
  closedDays: ClosedDay[];
}

export function InitiativesSummary({ initiatives, scheduledInitiatives, closedDays }: InitiativesSummaryProps) {
  // Filtrar solo iniciativas activas (no cerradas)
  const activeInitiatives = initiatives.filter(i => !i.closedAt);
  
  // Calcular horas totales por iniciativa
  const initiativeSummaries = activeInitiatives.map((initiative) => {
    const scheduled = scheduledInitiatives.filter((s) => s.initiativeId === initiative.id);
    
    const totalHours = scheduled.reduce((total, s) => {
      const hoursSum = Object.values(s.hoursPerDay).reduce((sum, hours) => sum + hours, 0);
      return total + hoursSum;
    }, 0);
    
    // Calcular horas consumidas (solo de días cerrados)
    const consumedHours = closedDays.reduce((total, cd) => {
      return total + (cd.consumedHours[initiative.id] || 0);
    }, 0);
    
    const daysScheduled = scheduled.reduce((total, s) => {
      return total + Object.keys(s.hoursPerDay).length;
    }, 0);
    
    return {
      initiative,
      totalHours,
      consumedHours,
      daysScheduled,
      instancesCount: scheduled.length,
    };
  });
  
  // Ordenar por horas totales (mayor a menor)
  const sortedSummaries = [...initiativeSummaries].sort((a, b) => b.totalHours - a.totalHours);
  
  // Calcular total general
  const grandTotal = initiativeSummaries.reduce((sum, s) => sum + s.totalHours, 0);
  const totalEstimated = initiativeSummaries.reduce((sum, s) => sum + (s.initiative.estimatedHours || 0), 0);
  
  // Encontrar el máximo de horas para escalar las barras (entre planificado y estimado)
  const maxHours = Math.max(
    ...initiativeSummaries.map(s => Math.max(s.totalHours, s.initiative.estimatedHours || 0)),
    1
  );
  
  if (initiatives.length === 0) {
    return (
      <div className="bg-white border-b p-4">
        <p className="text-sm text-gray-500 text-center">No hay iniciativas creadas. Crea una iniciativa para comenzar.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white border-b p-4 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Resumen de Iniciativas</h2>
        <div className="flex items-center gap-4 text-sm">
          {totalEstimated > 0 && (
            <>
              <div>
                <span className="text-gray-500">Estimado:</span>
                <span className="font-semibold text-purple-600 ml-1">{totalEstimated}h</span>
              </div>
              <div className="w-px h-4 bg-gray-300" />
            </>
          )}
          <div>
            <span className="text-gray-500">Planificado:</span>
            <span className="font-semibold text-blue-600 ml-1">{grandTotal}h</span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div>
            <span className="text-gray-500">Consumido:</span>
            <span className="font-semibold text-green-600 ml-1">
              {initiativeSummaries.reduce((sum, s) => sum + s.consumedHours, 0)}h
            </span>
          </div>
          {totalEstimated > 0 && (
            <div>
              {grandTotal === totalEstimated ? (
                <CheckCircle className="w-5 h-5 text-green-500" title="Planificación completa" />
              ) : grandTotal > totalEstimated ? (
                <AlertTriangle className="w-5 h-5 text-orange-500" title="Sobre-planificado" />
              ) : (
                <AlertCircle className="w-5 h-5 text-blue-500" title="Falta planificar" />
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {sortedSummaries.map(({ initiative, totalHours, consumedHours, daysScheduled, instancesCount }) => {
          const IconComponent = Icons[initiative.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
          const estimatedHours = initiative.estimatedHours || 0;
          const plannedPercentage = maxHours > 0 ? (totalHours / maxHours) * 100 : 0;
          const estimatedPercentage = maxHours > 0 ? (estimatedHours / maxHours) * 100 : 0;
          const consumedPercentage = maxHours > 0 ? (consumedHours / maxHours) * 100 : 0;
          
          // Determinar estado
          let statusIcon = null;
          let statusColor = '';
          if (estimatedHours > 0) {
            if (consumedHours >= estimatedHours) {
              statusIcon = <CheckCircle className="w-4 h-4 text-green-500" />;
              statusColor = 'text-green-600';
            } else if (totalHours > estimatedHours) {
              statusIcon = <AlertTriangle className="w-4 h-4 text-orange-500" />;
              statusColor = 'text-orange-600';
            } else {
              statusIcon = <AlertCircle className="w-4 h-4 text-blue-500" />;
              statusColor = 'text-blue-600';
            }
          }
          
          return (
            <div key={initiative.id} className="flex items-center gap-3 group hover:bg-gray-50 px-2 py-1.5 rounded transition-colors">
              {/* Icono */}
              <div 
                className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: initiative.color + '30' }}
              >
                {IconComponent && (
                  <IconComponent className="w-4 h-4" style={{ color: initiative.color }} />
                )}
              </div>
              
              {/* Nombre */}
              <div className="w-48 flex-shrink-0">
                <p className="text-sm font-medium truncate" title={initiative.name}>
                  {initiative.name}
                </p>
                {consumedHours > 0 && (
                  <p className="text-xs text-green-600 font-medium">
                    {consumedHours}h consumidas
                  </p>
                )}
              </div>
              
              {/* Barra de progreso con estimado, planificado y consumido */}
              <div className="flex-1 min-w-0">
                <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden relative">
                  {/* Barra de estimado (fondo más claro) */}
                  {estimatedHours > 0 && (
                    <div 
                      className="absolute h-full transition-all duration-300 opacity-20"
                      style={{ 
                        backgroundColor: initiative.color,
                        width: `${estimatedPercentage}%`,
                      }}
                    />
                  )}
                  
                  {/* Barra de planificado (medio opaco) */}
                  <div 
                    className="absolute h-full transition-all duration-300"
                    style={{ 
                      backgroundColor: initiative.color + '80',
                      width: `${plannedPercentage}%`,
                    }}
                  />
                  
                  {/* Barra de consumido (color sólido) */}
                  <div 
                    className="absolute h-full transition-all duration-300 flex items-center justify-end px-2"
                    style={{ 
                      backgroundColor: initiative.color,
                      width: `${consumedPercentage}%`,
                      minWidth: (consumedHours > 0 || totalHours > 0) ? '80px' : '0'
                    }}
                  >
                    {(consumedHours > 0 || totalHours > 0) && (
                      <span className="text-xs font-bold text-white whitespace-nowrap">
                        {consumedHours > 0 ? `${consumedHours}h` : `${totalHours}h`}
                        {estimatedHours > 0 && ` / ${estimatedHours}h`}
                      </span>
                    )}
                  </div>
                  
                  {totalHours === 0 && estimatedHours === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-gray-400">Sin planificar</span>
                    </div>
                  )}
                  
                  {totalHours === 0 && estimatedHours > 0 && (
                    <div className="absolute inset-0 flex items-center px-2">
                      <span className="text-xs text-gray-600">
                        0h / {estimatedHours}h
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Estado y estadísticas */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {statusIcon && (
                  <div className="flex items-center gap-1" title={
                    consumedHours >= estimatedHours ? 'Completado' :
                    totalHours > estimatedHours ? `Sobre-planificado: +${(totalHours - estimatedHours).toFixed(1)}h` :
                    `Falta consumir: ${(estimatedHours - consumedHours).toFixed(1)}h`
                  }>
                    {statusIcon}
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <div className="text-right">
                    <span className="font-medium">{daysScheduled}</span>
                    <span className="ml-1">días</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{instancesCount}</span>
                    <span className="ml-1">inst.</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Leyenda */}
      <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-gray-500">
        <div>
          Mostrando {activeInitiatives.length} iniciativa{activeInitiatives.length !== 1 ? 's' : ''} activa{activeInitiatives.length !== 1 ? 's' : ''} • 
          {' '}{scheduledInitiatives.length} programación{scheduledInitiatives.length !== 1 ? 'es' : ''} •
          {' '}{closedDays.length} día{closedDays.length !== 1 ? 's' : ''} cerrado{closedDays.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-12 h-3 rounded-full bg-blue-500 opacity-20" />
            <span>Estimado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-3 rounded-full bg-blue-500 opacity-50" />
            <span>Planificado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-3 rounded-full bg-blue-500" />
            <span>Consumido</span>
          </div>
        </div>
      </div>
    </div>
  );
}