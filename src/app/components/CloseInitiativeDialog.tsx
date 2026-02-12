import { X, CheckCircle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Initiative, ScheduledInitiative, ClosedDay } from '../types';
import { Button } from './ui/button';
import * as Icons from 'lucide-react';

interface CloseInitiativeDialogProps {
  open: boolean;
  initiative: Initiative | null;
  scheduledInitiatives: ScheduledInitiative[];
  closedDays: ClosedDay[];
  onClose: () => void;
  onConfirm?: () => void; // Opcional - solo disponible si no está finalizada
}

export function CloseInitiativeDialog({
  open,
  initiative,
  scheduledInitiatives,
  closedDays,
  onClose,
  onConfirm,
}: CloseInitiativeDialogProps) {
  if (!open || !initiative) return null;

  const isClosed = !!initiative.closedAt;

  // Calcular horas planificadas
  const scheduled = scheduledInitiatives.filter((s) => s.initiativeId === initiative.id);
  const totalPlanned = scheduled.reduce((total, s) => {
    const hoursSum = Object.values(s.hoursPerDay).reduce((sum, hours) => sum + hours, 0);
    return total + hoursSum;
  }, 0);

  // Calcular horas consumidas (solo de días cerrados)
  const totalConsumed = closedDays.reduce((total, cd) => {
    return total + (cd.consumedHours[initiative.id] || 0);
  }, 0);

  // Calcular horas pendientes (planificadas en días no cerrados)
  const totalPending = scheduled.reduce((total, s) => {
    return total + Object.entries(s.hoursPerDay).reduce((sum, [date, hours]) => {
      const isClosed = closedDays.some(cd => cd.date === date);
      return sum + (isClosed ? 0 : hours);
    }, 0);
  }, 0);

  const estimatedHours = initiative.estimatedHours || 0;
  const variance = totalConsumed - estimatedHours;
  const variancePercent = estimatedHours > 0 ? (variance / estimatedHours) * 100 : 0;

  const IconComponent = initiative.icon 
    ? (Icons[initiative.icon as keyof typeof Icons] as React.ComponentType<{ className?: string; style?: React.CSSProperties }>)
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            {IconComponent && (
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: initiative.color + '30' }}
              >
                <IconComponent className="w-6 h-6" style={{ color: initiative.color }} />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold">
                {isClosed ? 'Resumen de Iniciativa' : 'Finalizar Iniciativa'}
              </h2>
              <p className="text-sm text-gray-600">{initiative.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Advertencia si hay horas pendientes - solo cuando no está finalizada */}
          {!isClosed && totalPending > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900">Hay horas planificadas pendientes</p>
                <p className="text-sm text-orange-700 mt-1">
                  Esta iniciativa tiene <span className="font-bold">{totalPending}h</span> planificadas en días que aún no han sido cerrados. 
                  Al finalizar la iniciativa, no se podrá seguir planificando.
                </p>
              </div>
            </div>
          )}

          {/* Resumen de horas */}
          <div className="grid grid-cols-3 gap-4">
            {/* Estimado */}
            <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
              <div className="text-sm text-purple-600 font-medium mb-1">Estimado</div>
              <div className="text-3xl font-bold text-purple-700">{estimatedHours}h</div>
              <div className="text-xs text-purple-600 mt-1">Horas estimadas</div>
            </div>

            {/* Consumido */}
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <div className="text-sm text-green-600 font-medium mb-1">Consumido</div>
              <div className="text-3xl font-bold text-green-700">{totalConsumed}h</div>
              <div className="text-xs text-green-600 mt-1">Días cerrados</div>
            </div>

            {/* Variación */}
            <div className={`rounded-lg p-4 border-2 ${
              variance > 0 
                ? 'bg-orange-50 border-orange-200' 
                : variance < 0 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-gray-50 border-gray-200'
            }`}>
              <div className={`text-sm font-medium mb-1 ${
                variance > 0 ? 'text-orange-600' : variance < 0 ? 'text-blue-600' : 'text-gray-600'
              }`}>
                Variación
              </div>
              <div className={`text-3xl font-bold flex items-center gap-2 ${
                variance > 0 ? 'text-orange-700' : variance < 0 ? 'text-blue-700' : 'text-gray-700'
              }`}>
                {variance > 0 ? '+' : ''}{variance}h
                {variance > 0 && <TrendingUp className="w-6 h-6" />}
                {variance < 0 && <TrendingDown className="w-6 h-6" />}
              </div>
              <div className={`text-xs mt-1 ${
                variance > 0 ? 'text-orange-600' : variance < 0 ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {variance > 0 ? `+${variancePercent.toFixed(1)}%` : variance < 0 ? `${variancePercent.toFixed(1)}%` : '0%'}
              </div>
            </div>
          </div>

          {/* Barra visual comparativa */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Comparación Visual</div>
            <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
              {/* Barra de estimado (fondo) */}
              {estimatedHours > 0 && (
                <div 
                  className="absolute h-full bg-purple-300 opacity-40"
                  style={{ width: '100%' }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-purple-800">
                    Estimado: {estimatedHours}h
                  </div>
                </div>
              )}
              
              {/* Barra de consumido */}
              {totalConsumed > 0 && (
                <div 
                  className="absolute h-full bg-green-500 flex items-center justify-center"
                  style={{ 
                    width: estimatedHours > 0 
                      ? `${Math.min((totalConsumed / estimatedHours) * 100, 100)}%`
                      : '100%',
                    minWidth: '80px'
                  }}
                >
                  <span className="text-xs font-bold text-white">
                    Consumido: {totalConsumed}h
                  </span>
                </div>
              )}
              
              {/* Indicador de sobrepaso */}
              {totalConsumed > estimatedHours && estimatedHours > 0 && (
                <div 
                  className="absolute h-full bg-orange-500 opacity-80 flex items-center justify-center"
                  style={{ 
                    left: '100%',
                    width: `${((totalConsumed - estimatedHours) / estimatedHours) * 100}%`,
                    minWidth: '60px'
                  }}
                >
                  <span className="text-xs font-bold text-white">
                    +{totalConsumed - estimatedHours}h
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Estadísticas adicionales */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs text-gray-500 uppercase font-medium mb-1">Total Planificado</div>
              <div className="text-lg font-bold text-gray-800">{totalPlanned}h</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-medium mb-1">Pendiente</div>
              <div className="text-lg font-bold text-gray-800">{totalPending}h</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-medium mb-1">Días con programación</div>
              <div className="text-lg font-bold text-gray-800">
                {scheduled.reduce((total, s) => total + Object.keys(s.hoursPerDay).length, 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-medium mb-1">Eficiencia</div>
              <div className="text-lg font-bold text-gray-800">
                {estimatedHours > 0 && totalConsumed > 0 
                  ? `${((estimatedHours / totalConsumed) * 100).toFixed(0)}%`
                  : '-'
                }
              </div>
            </div>
          </div>

          {/* Estado final */}
          <div className={`p-4 rounded-lg border-2 flex items-center gap-3 ${
            variance === 0 
              ? 'bg-green-50 border-green-500'
              : variance > 0
                ? 'bg-orange-50 border-orange-500'
                : 'bg-blue-50 border-blue-500'
          }`}>
            {variance === 0 ? (
              <>
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <div className="font-semibold text-green-900">Iniciativa completada según estimación</div>
                  <div className="text-sm text-green-700">
                    Se consumieron exactamente las horas estimadas.
                  </div>
                </div>
              </>
            ) : variance > 0 ? (
              <>
                <AlertTriangle className="w-6 h-6 text-orange-600" />
                <div>
                  <div className="font-semibold text-orange-900">Iniciativa con sobrecosto</div>
                  <div className="text-sm text-orange-700">
                    Se consumieron {variance}h más de lo estimado ({variancePercent.toFixed(1)}% de sobrecosto).
                  </div>
                </div>
              </>
            ) : (
              <>
                <CheckCircle className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="font-semibold text-blue-900">Iniciativa bajo presupuesto</div>
                  <div className="text-sm text-blue-700">
                    Se consumieron {Math.abs(variance)}h menos de lo estimado ({Math.abs(variancePercent).toFixed(1)}% de ahorro).
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            {isClosed ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!isClosed && onConfirm && (
            <Button 
              onClick={onConfirm}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Finalizar Iniciativa
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}