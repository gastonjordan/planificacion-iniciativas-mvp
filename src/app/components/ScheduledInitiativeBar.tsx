import { useState, useRef } from 'react';
import { X, GripVertical, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { useDrag } from 'react-dnd';
import { Initiative, ScheduledInitiative } from '../types';
import { Button } from './ui/button';
import { format, eachDayOfInterval, parseISO, addDays, subDays, isWeekend } from 'date-fns';
import { es } from 'date-fns/locale';
import * as Icons from 'lucide-react';

interface ScheduledInitiativeBarProps {
  scheduled: ScheduledInitiative;
  initiative: Initiative;
  weekStartDate: Date;
  onRemove: () => void;
  onHoursChange: (date: string, hours: number) => void;
  onResize: (newEndDate: string) => void;
  onDuplicate?: () => void;
  isAnyClosed?: boolean; // Si alguno de los días de la iniciativa está cerrado
}

export function ScheduledInitiativeBar({
  scheduled,
  initiative,
  weekStartDate,
  onRemove,
  onHoursChange,
  onResize,
  onDuplicate,
  isAnyClosed = false,
}: ScheduledInitiativeBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Verificar si la iniciativa está finalizada
  const isInitiativeClosed = !!initiative.closedAt;
  
  // No permitir edición si el día está cerrado O si la iniciativa está finalizada
  const canEdit = !isAnyClosed && !isInitiativeClosed;

  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'SCHEDULED_INITIATIVE',
    item: { scheduledId: scheduled.id },
    canDrag: canEdit, // No permitir drag si algún día está cerrado o iniciativa finalizada
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [scheduled.id, canEdit]);

  // Conectar el drag solo al handle
  drag(dragHandleRef);

  const IconComponent = initiative.icon 
    ? (Icons[initiative.icon as keyof typeof Icons] as React.ComponentType<{ className?: string; style?: React.CSSProperties }>)
    : null;

  const startDate = parseISO(scheduled.startDate);
  const endDate = parseISO(scheduled.endDate);

  // Obtener todos los días del rango
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Filtrar solo días laborables (lunes a viernes)
  const workDays = allDays.filter((day) => !isWeekend(day));

  // Calcular las horas totales
  const totalHours = workDays.reduce((sum, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return sum + (scheduled.hoursPerDay[dateStr] || 8);
  }, 0);

  // Calcular posición en el grid
  const weekEnd = addDays(weekStartDate, 4); // Viernes de la semana
  const displayStartDate = startDate < weekStartDate ? weekStartDate : startDate;
  const displayEndDate = endDate > weekEnd ? weekEnd : endDate;

  // Filtrar solo días laborables para el cálculo de columnas
  const displayDays = eachDayOfInterval({
    start: displayStartDate,
    end: displayEndDate,
  }).filter((day) => !isWeekend(day));

  // Calcular columna de inicio (1-5 para Lun-Vie)
  // Necesitamos saber qué columna corresponde al displayStartDate
  const allWeekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStartDate, i));
  const gridColumnStart = allWeekDays.findIndex(day => 
    format(day, 'yyyy-MM-dd') === format(displayStartDate, 'yyyy-MM-dd')
  ) + 1;
  
  const gridColumnSpan = displayDays.length;

  // Calcular altura basada en horas - proporcional puro
  // Para que 2 iniciativas de 4h = 1 iniciativa de 8h, la altura debe ser puramente proporcional
  // 8 horas = 200px base, entonces 25px por hora
  const firstVisibleDay = displayDays[0];
  const firstVisibleDateStr = format(firstVisibleDay, 'yyyy-MM-dd');
  const hoursForFirstDay = scheduled.hoursPerDay[firstVisibleDateStr] || 8;
  const pixelsPerHour = 25; // 25px por cada hora (8h = 200px)
  const calculatedHeight = hoursForFirstDay * pixelsPerHour;
  const minHeight = 50; // Altura mínima visual para que sea clickeable/legible
  const barHeight = Math.max(calculatedHeight, minHeight);

  // Debug log
  console.log('ScheduledInitiativeBar Render:', {
    iniciativa: initiative.name,
    fechaPrimerDia: firstVisibleDateStr,
    horasDelDia: hoursForFirstDay,
    hoursPerDayCompleto: scheduled.hoursPerDay,
    alturaCalculada: barHeight,
    timestamp: new Date().getTime()
  });

  const handleExtendDay = () => {
    let newEndDate = addDays(endDate, 1);
    // Saltar fines de semana
    while (isWeekend(newEndDate)) {
      newEndDate = addDays(newEndDate, 1);
    }
    onResize(format(newEndDate, 'yyyy-MM-dd'));
  };

  const handleReduceDay = () => {
    if (workDays.length <= 1) return;
    let newEndDate = subDays(endDate, 1);
    // Saltar fines de semana hacia atrás
    while (isWeekend(newEndDate)) {
      newEndDate = subDays(newEndDate, 1);
    }
    onResize(format(newEndDate, 'yyyy-MM-dd'));
  };

  return (
    <div
      ref={(node) => {
        preview(node);
        if (barRef.current !== node) {
          barRef.current = node as HTMLDivElement;
        }
      }}
      className="relative rounded-md border-2 group pointer-events-auto overflow-hidden"
      style={{
        backgroundColor: initiative.color + '20',
        borderColor: initiative.color,
        opacity: isDragging ? 0.5 : 1,
        height: `${barHeight}px`,
      }}
    >
      {/* Header - siempre visible */}
      <div className="p-2 h-full flex flex-col">
        {/* Primera fila: Grip, Icono, Nombre, Horas y Botones */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Grip */}
          <div 
            ref={dragHandleRef}
            className={`p-1 -ml-1 rounded transition-colors flex-shrink-0 ${
              !canEdit 
                ? 'cursor-not-allowed opacity-50' 
                : 'cursor-grab active:cursor-grabbing hover:bg-black/10'
            }`}
            title={!canEdit ? 'No se puede mover - día cerrado o iniciativa finalizada' : 'Arrastrar para mover'}
          >
            <GripVertical className="w-4 h-4 text-gray-500" />
          </div>
          
          {/* Icono de la iniciativa */}
          {IconComponent && (
            <div 
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: initiative.color + '40' }}
            >
              <IconComponent className="w-3 h-3" style={{ color: initiative.color }} />
            </div>
          )}
          
          {/* Nombre de la iniciativa */}
          <div 
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => workDays.length > 1 && setIsExpanded(!isExpanded)}
            title={initiative.name}
          >
            <p className="font-semibold text-sm truncate">
              {initiative.name}
            </p>
          </div>
          
          {/* Input rápido de horas - solo para iniciativas de 1 día */}
          {workDays.length === 1 && (
            <div 
              className="flex items-center gap-0.5 flex-shrink-0 bg-white rounded border px-1 py-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={scheduled.hoursPerDay[format(workDays[0], 'yyyy-MM-dd')] || 0}
                onChange={(e) => {
                  if (!canEdit) return; // No permitir cambios si está cerrado o finalizado
                  e.stopPropagation();
                  const dateStr = format(workDays[0], 'yyyy-MM-dd');
                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  onHoursChange(dateStr, isNaN(value) ? 0 : value);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canEdit) e.currentTarget.select();
                }}
                disabled={!canEdit}
                className={`w-9 text-xs font-medium text-center focus:outline-none ${
                  !canEdit ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={!canEdit ? 'No se puede editar - día cerrado o iniciativa finalizada' : ''}
              />
              <span className="text-xs text-gray-500">h</span>
            </div>
          )}
          
          {/* Botones de acción a la derecha */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {/* Botones de resize - solo para multi-día */}
            {workDays.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReduceDay();
                  }}
                  disabled={workDays.length <= 1 || !canEdit}
                  className="h-5 w-5 p-0 bg-white hover:bg-gray-100 disabled:opacity-30"
                  title={!canEdit ? 'No se puede editar - día cerrado o iniciativa finalizada' : 'Reducir un día'}
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExtendDay();
                  }}
                  disabled={!canEdit}
                  className="h-5 w-5 p-0 bg-white hover:bg-gray-100 disabled:opacity-30"
                  title={!canEdit ? 'No se puede editar - día cerrado o iniciativa finalizada' : 'Extender un día'}
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </>
            )}
            
            {/* Botón de duplicar */}
            {onDuplicate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
                className="h-5 w-5 p-0"
                title="Duplicar iniciativa"
              >
                <Copy className="w-3 h-3" />
              </Button>
            )}
            
            {/* Botón eliminar - deshabilitado si está cerrado o iniciativa finalizada */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (isAnyClosed) {
                  alert('No se puede eliminar una iniciativa en un día cerrado');
                  return;
                }
                if (isInitiativeClosed) {
                  alert('No se puede eliminar una iniciativa finalizada');
                  return;
                }
                onRemove();
              }}
              disabled={!canEdit}
              className="h-5 w-5 p-0 disabled:opacity-30"
              title={
                isInitiativeClosed 
                  ? 'No se puede eliminar - iniciativa finalizada' 
                  : isAnyClosed 
                    ? 'No se puede eliminar - día cerrado' 
                    : 'Eliminar'
              }
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Detalle expandible - horas por día */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t flex-1 overflow-y-auto" style={{ borderColor: initiative.color }}>
            <p className="text-xs font-medium text-gray-700 mb-2">Horas por día:</p>
            <div className="space-y-2">
              {workDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const hours = scheduled.hoursPerDay[dateStr] || 0;
                
                return (
                  <div key={dateStr} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-20">
                      {format(day, 'EEE dd/MM', { locale: es })}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={hours}
                      onChange={(e) => {
                        if (!canEdit) return; // No permitir cambios si está cerrado o finalizado
                        e.stopPropagation();
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        onHoursChange(dateStr, isNaN(value) ? 0 : value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      disabled={!canEdit}
                      className={`w-16 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        !canEdit ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title={!canEdit ? 'No se puede editar - día cerrado o iniciativa finalizada' : ''}
                    />
                    <span className="text-xs text-gray-500">horas</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}