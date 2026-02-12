import { useDrop } from 'react-dnd';
import { ChevronLeft, ChevronRight, Lock, LockOpen } from 'lucide-react';
import { Button } from './ui/button';
import { Initiative, ScheduledInitiative, ClosedDay } from '../types';
import { ScheduledInitiativeBar } from './ScheduledInitiativeBar';
import { InitiativesSummary } from './InitiativesSummary';
import { format, addWeeks, startOfWeek, addDays, parseISO, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import danworLogo from '../../assets/danwor-logo.png';

interface WeeklyCalendarProps {
  initiatives: Initiative[];
  scheduledInitiatives: ScheduledInitiative[];
  closedDays: ClosedDay[];
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  onScheduleInitiative: (initiativeId: string, date: string) => void;
  onMoveScheduled: (scheduledId: string, newStartDate: string) => void;
  onRemoveScheduled: (scheduledId: string) => void;
  onUpdateHours: (scheduledId: string, date: string, hours: number) => void;
  onResizeScheduled: (scheduledId: string, newEndDate: string) => void;
  onDuplicateScheduled?: (scheduledId: string) => void;
  onCloseDay: (date: string) => void;
  onReopenDay: (date: string) => void;
}

function DayCell({
  day,
  isClosed,
  onScheduleInitiative,
  onMoveScheduled,
}: {
  day: Date;
  isClosed: boolean;
  onScheduleInitiative: (initiativeId: string, date: string) => void;
  onMoveScheduled: (scheduledId: string, newStartDate: string) => void;
}) {
  const dateStr = format(day, 'yyyy-MM-dd');
  
  const [{ isOver }, drop] = useDrop(() => ({
    accept: isClosed ? [] : ['INITIATIVE', 'SCHEDULED_INITIATIVE'], // Deshabilitar drop si está cerrado
    drop: (item: { initiativeId?: string; scheduledId?: string }) => {
      if (isClosed) return; // No permitir drop en días cerrados
      console.log('Drop detected:', item, dateStr);
      if (item.initiativeId) {
        console.log('Scheduling initiative:', item.initiativeId, dateStr);
        onScheduleInitiative(item.initiativeId, dateStr);
      } else if (item.scheduledId) {
        console.log('Moving scheduled:', item.scheduledId, dateStr);
        onMoveScheduled(item.scheduledId, dateStr);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [dateStr, onScheduleInitiative, onMoveScheduled, isClosed]);

  return (
    <div
      ref={drop}
      className={`border-r last:border-r-0 p-2 transition-all min-h-[250px] flex flex-col relative z-0 ${
        isClosed 
          ? 'bg-gray-100 opacity-60' 
          : isOver 
            ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset z-10' 
            : 'bg-white'
      }`}
    >
      {/* Indicador de día cerrado */}
      {isClosed && (
        <div className="absolute top-2 right-2 z-20">
          <Lock className="w-5 h-5 text-gray-500" />
        </div>
      )}
      
      {/* Texto guía para arrastrar */}
      <div className={`flex items-center justify-center flex-1 transition-opacity pointer-events-none ${
        isOver ? 'opacity-100' : isClosed ? 'opacity-0' : 'opacity-20'
      }`}>
        <p className={`text-sm text-center px-2 font-medium transition-all ${
          isOver ? 'text-blue-600 scale-110' : 'text-gray-400'
        }`}>
          {isOver ? '↓ Soltar aquí' : 'Arrastrar iniciativa aquí'}
        </p>
      </div>
    </div>
  );
}

function WeekRow({
  weekStart,
  initiatives,
  scheduledInitiatives,
  closedDays,
  onScheduleInitiative,
  onMoveScheduled,
  onRemoveScheduled,
  onUpdateHours,
  onResizeScheduled,
  onDuplicateScheduled,
  onCloseDay,
  onReopenDay,
}: {
  weekStart: Date;
  initiatives: Initiative[];
  scheduledInitiatives: ScheduledInitiative[];
  closedDays: ClosedDay[];
  onScheduleInitiative: (initiativeId: string, date: string) => void;
  onMoveScheduled: (scheduledId: string, newStartDate: string) => void;
  onRemoveScheduled: (scheduledId: string) => void;
  onUpdateHours: (scheduledId: string, date: string, hours: number) => void;
  onResizeScheduled: (scheduledId: string, newEndDate: string) => void;
  onDuplicateScheduled?: (scheduledId: string) => void;
  onCloseDay: (date: string) => void;
  onReopenDay: (date: string) => void;
}) {
  // Solo días laborales (Lun-Vie)
  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  // Filter scheduled initiatives that overlap with this week
  const weekEnd = addDays(weekStart, 4); // Viernes
  const relevantScheduled = scheduledInitiatives.filter((scheduled) => {
    const schedStart = parseISO(scheduled.startDate);
    const schedEnd = parseISO(scheduled.endDate);
    return schedStart <= weekEnd && schedEnd >= weekStart;
  });

  // Calculate total hours per day for this week
  const hoursPerDay = days.map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return relevantScheduled.reduce((total, scheduled) => {
      return total + (scheduled.hoursPerDay[dateStr] || 0);
    }, 0);
  });

  return (
    <div className="border rounded-lg overflow-hidden mb-6">
      <div className="bg-gray-100 px-4 py-2 border-b flex items-center justify-between">
        <h3 className="font-medium">
          Semana del {format(weekStart, 'dd MMM', { locale: es })}
        </h3>
      </div>
      
      {/* Day headers with total hours */}
      <div className="grid grid-cols-5 border-b">
        {days.map((day, idx) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const totalHours = hoursPerDay[idx];
          const capacityPercent = (totalHours / 8) * 100;
          const isClosed = closedDays.some(cd => cd.date === dateStr);
          
          // Determinar color según capacidad
          let barColor = 'bg-green-500';
          let textColor = 'text-green-700';
          if (totalHours > 8) {
            barColor = 'bg-orange-500';
            textColor = 'text-orange-700';
          }
          
          return (
            <div key={idx} className="border-r last:border-r-0 p-2 bg-gray-50 relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 text-center">
                    {format(day, 'EEE', { locale: es })}
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-0.5">
                    {format(day, 'dd MMM', { locale: es })}
                  </div>
                </div>
                
                {/* Botón de cerrar/abrir día */}
                <button
                  onClick={() => isClosed ? onReopenDay(dateStr) : onCloseDay(dateStr)}
                  className={`p-1 rounded transition-all hover:bg-gray-200 ${
                    isClosed ? 'text-gray-600' : 'text-gray-400 hover:text-green-600'
                  }`}
                  title={isClosed ? 'Reabrir día' : 'Cerrar día'}
                >
                  {isClosed ? <LockOpen className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Resumen visual de horas */}
              {totalHours > 0 && (
                <div className="mt-2">
                  <div className={`text-xs text-center font-bold ${textColor} mb-1`}>
                    {totalHours}h / 8h
                  </div>
                  {/* Barra de progreso */}
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full ${barColor} transition-all duration-300`}
                      style={{ width: `${Math.min(capacityPercent, 100)}%` }}
                    />
                  </div>
                  {/* Indicador de sobrecarga */}
                  {totalHours > 8 && (
                    <div className="text-xs text-center text-orange-600 font-medium mt-1">
                      +{(totalHours - 8).toFixed(1)}h extra
                    </div>
                  )}
                </div>
              )}
              
              {/* Mostrar cuando está vacío */}
              {totalHours === 0 && (
                <div className="mt-2 text-xs text-center text-gray-400">
                  Sin horas
                </div>
              )}
              
              {/* Indicador de día cerrado */}
              {isClosed && (
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-600 font-medium">
                  <Lock className="w-3 h-3" />
                  <span>Cerrado</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Day cells - each is a drop zone */}
      <div className="grid grid-cols-5 min-h-[200px] max-h-[600px] relative overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
        {days.map((day, idx) => (
          <DayCell
            key={idx}
            day={day}
            isClosed={closedDays.some(closed => closed.date === format(day, 'yyyy-MM-dd'))} // Aquí se verifica si el día está cerrado
            onScheduleInitiative={onScheduleInitiative}
            onMoveScheduled={onMoveScheduled}
          />
        ))}
        
        {/* Overlay con iniciativas programadas - posicionamiento absoluto independiente */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="grid grid-cols-5 h-full p-2 gap-2">
            {/* Crear una columna flex para cada día */}
            {days.map((day, dayIdx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              
              // Iniciativas que empiezan exactamente en este día
              const dayScheduled = relevantScheduled.filter((scheduled) => {
                return scheduled.startDate === dateStr;
              });
              
              return (
                <div key={dayIdx} className="flex flex-col gap-2 relative">
                  {dayScheduled.map((scheduled) => {
                    const initiative = initiatives.find((i) => i.id === scheduled.initiativeId);
                    if (!initiative) return null;

                    // Calcular si se extiende a múltiples días
                    const schedStart = parseISO(scheduled.startDate);
                    const schedEnd = parseISO(scheduled.endDate);
                    const allDays = eachDayOfInterval({ start: schedStart, end: schedEnd });
                    const workDays = allDays.filter((d) => {
                      const weekday = d.getDay();
                      return weekday !== 0 && weekday !== 6;
                    });
                    const isMultiDay = workDays.length > 1;

                    // Verificar si alguno de los días de esta iniciativa está cerrado
                    const isAnyClosed = workDays.some(day => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      return closedDays.some(cd => cd.date === dayStr);
                    });

                    if (isMultiDay) {
                      // Para iniciativas multi-día, usar posición absoluta para extenderse
                      // Calcular qué columnas ocupa dentro de esta semana
                      const weekEnd = addDays(weekStart, 4);
                      const displayStartDate = schedStart < weekStart ? weekStart : schedStart;
                      const displayEndDate = schedEnd > weekEnd ? weekEnd : schedEnd;
                      
                      const displayDays = eachDayOfInterval({
                        start: displayStartDate,
                        end: displayEndDate,
                      }).filter((d) => {
                        const weekday = d.getDay();
                        return weekday !== 0 && weekday !== 6;
                      });
                      
                      const allWeekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
                      const gridColumnStart = allWeekDays.findIndex(d => 
                        format(d, 'yyyy-MM-dd') === format(displayStartDate, 'yyyy-MM-dd')
                      );
                      const gridColumnSpan = displayDays.length;
                      
                      // Calcular el ancho y la posición left
                      const columnWidth = 100 / 5; // 20% por columna
                      const gapWidth = 0.5; // gap-2 = 0.5rem aproximado
                      const leftPercent = gridColumnStart * columnWidth;
                      const widthPercent = gridColumnSpan * columnWidth - (gapWidth * 0.5);
                      
                      return (
                        <div
                          key={scheduled.id}
                          className="absolute"
                          style={{
                            left: `calc(${leftPercent}% + ${gridColumnStart * 0.5}rem)`,
                            width: `calc(${widthPercent}% - ${gapWidth}rem)`,
                            top: 0,
                          }}
                        >
                          <ScheduledInitiativeBar
                            scheduled={scheduled}
                            initiative={initiative}
                            weekStartDate={weekStart}
                            onRemove={() => onRemoveScheduled(scheduled.id)}
                            onHoursChange={(date, hours) => onUpdateHours(scheduled.id, date, hours)}
                            onResize={(newEndDate) => onResizeScheduled(scheduled.id, newEndDate)}
                            onDuplicate={onDuplicateScheduled ? () => onDuplicateScheduled(scheduled.id) : undefined}
                            isAnyClosed={isAnyClosed}
                          />
                        </div>
                      );
                    } else {
                      // Para iniciativas de un solo día, renderizar normalmente en el flujo flex
                      return (
                        <ScheduledInitiativeBar
                          key={scheduled.id}
                          scheduled={scheduled}
                          initiative={initiative}
                          weekStartDate={weekStart}
                          onRemove={() => onRemoveScheduled(scheduled.id)}
                          onHoursChange={(date, hours) => onUpdateHours(scheduled.id, date, hours)}
                          onResize={(newEndDate) => onResizeScheduled(scheduled.id, newEndDate)}
                          onDuplicate={onDuplicateScheduled ? () => onDuplicateScheduled(scheduled.id) : undefined}
                          isAnyClosed={isAnyClosed}
                        />
                      );
                    }
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WeeklyCalendar({
  initiatives,
  scheduledInitiatives,
  closedDays,
  weekOffset,
  onWeekChange,
  onScheduleInitiative,
  onMoveScheduled,
  onRemoveScheduled,
  onUpdateHours,
  onResizeScheduled,
  onDuplicateScheduled,
  onCloseDay,
  onReopenDay,
}: WeeklyCalendarProps) {
  const today = new Date();
  const startDate = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  
  const weeks = Array.from({ length: 4 }, (_, i) => addWeeks(startDate, i));

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <div className="border-b p-4 bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <img src={danworLogo} alt="Danwor" className="h-10" />
          <div className="w-px h-8 bg-gray-300" />
          <h1 className="text-2xl font-semibold">Planificación de Iniciativas</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onWeekChange(weekOffset - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[200px] text-center">
            {format(startDate, 'dd MMM yyyy', { locale: es })} - {format(addDays(startDate, 27), 'dd MMM yyyy', { locale: es })}
          </span>
          <Button variant="outline" size="sm" onClick={() => onWeekChange(weekOffset + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Resumen de todas las iniciativas */}
      <InitiativesSummary 
        initiatives={initiatives}
        scheduledInitiatives={scheduledInitiatives}
        closedDays={closedDays}
      />
      
      <div className="flex-1 overflow-auto p-4">
        {weeks.map((weekStart, idx) => (
          <WeekRow
            key={idx}
            weekStart={weekStart}
            initiatives={initiatives}
            scheduledInitiatives={scheduledInitiatives}
            closedDays={closedDays}
            onScheduleInitiative={onScheduleInitiative}
            onMoveScheduled={onMoveScheduled}
            onRemoveScheduled={onRemoveScheduled}
            onUpdateHours={onUpdateHours}
            onResizeScheduled={onResizeScheduled}
            onDuplicateScheduled={onDuplicateScheduled}
            onCloseDay={onCloseDay}
            onReopenDay={onReopenDay}
          />
        ))}
      </div>
    </div>
  );
}