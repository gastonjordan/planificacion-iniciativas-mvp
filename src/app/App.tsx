import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { InitiativeList } from './components/InitiativeList';
import { InitiativeDialog } from './components/InitiativeDialog';
import { DuplicateInitiativeDialog } from './components/DuplicateInitiativeDialog';
import { CloseInitiativeDialog } from './components/CloseInitiativeDialog';
import { WeeklyCalendar } from './components/WeeklyCalendar';
import { ClosedInitiatives } from './components/ClosedInitiatives';
import { Initiative, ScheduledInitiative, ClosedDay } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { format, parseISO, eachDayOfInterval, addDays, isWeekend } from 'date-fns';
import { CalendarDays, Archive } from 'lucide-react';

function App() {
  const [initiatives, setInitiatives] = useLocalStorage<Initiative[]>('initiatives', []);
  const [scheduledInitiatives, setScheduledInitiatives] = useLocalStorage<ScheduledInitiative[]>(
    'scheduledInitiatives',
    []
  );
  const [closedDays, setClosedDays] = useLocalStorage<ClosedDay[]>('closedDays', []);
  const [weekOffset, setWeekOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState<Initiative | undefined>(undefined);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicatingScheduledId, setDuplicatingScheduledId] = useState<string | null>(null);
  const [closeInitiativeDialogOpen, setCloseInitiativeDialogOpen] = useState(false);
  const [closingInitiative, setClosingInitiative] = useState<Initiative | null>(null);
  const [activeTab, setActiveTab] = useState<'planning' | 'closed'>('planning');

  const handleCreateInitiative = (data: Omit<Initiative, 'id'>) => {
    const newInitiative: Initiative = {
      id: crypto.randomUUID(),
      ...data,
    };
    setInitiatives([...initiatives, newInitiative]);
  };

  const handleEditInitiative = (id: string, data: Omit<Initiative, 'id'>) => {
    setInitiatives(initiatives.map((i) => (i.id === id ? { ...i, ...data } : i)));
  };

  const handleDeleteInitiative = (id: string) => {
    setInitiatives(initiatives.filter((i) => i.id !== id));
    setScheduledInitiatives(scheduledInitiatives.filter((s) => s.initiativeId !== id));
  };

  const openEditDialog = (initiative: Initiative) => {
    setEditingInitiative(initiative);
    setDialogOpen(true);
  };

  const handleDialogSave = (data: Omit<Initiative, 'id'>) => {
    if (editingInitiative) {
      handleEditInitiative(editingInitiative.id, data);
    } else {
      handleCreateInitiative(data);
    }
    setEditingInitiative(undefined);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingInitiative(undefined);
  };

  const handleDuplicateScheduled = (scheduledId: string) => {
    setDuplicatingScheduledId(scheduledId);
    setDuplicateDialogOpen(true);
  };

  const handleDuplicateDays = (selectedDates: { date: string; hours: number }[]) => {
    if (!duplicatingScheduledId) return;
    
    const scheduled = scheduledInitiatives.find(s => s.id === duplicatingScheduledId);
    if (!scheduled) return;

    const newScheduledArray: ScheduledInitiative[] = [];
    
    selectedDates.forEach(({ date, hours }) => {
      const newScheduled: ScheduledInitiative = {
        id: crypto.randomUUID(),
        initiativeId: scheduled.initiativeId,
        startDate: date,
        endDate: date, // Solo un día
        hoursPerDay: {
          [date]: hours,
        },
      };
      newScheduledArray.push(newScheduled);
    });

    setScheduledInitiatives([...scheduledInitiatives, ...newScheduledArray]);
  };

  const handleDuplicateClose = () => {
    setDuplicateDialogOpen(false);
    setDuplicatingScheduledId(null);
  };

  const handleScheduleInitiative = (initiativeId: string, startDate: string) => {
    // Verificar si la iniciativa ya está programada en ese día
    const parsedDate = parseISO(startDate);
    const existingScheduled = scheduledInitiatives.find((s) => {
      if (s.initiativeId !== initiativeId) return false;
      
      const schedStart = parseISO(s.startDate);
      const schedEnd = parseISO(s.endDate);
      
      // Verificar si el día ya está cubierto por alguna programación existente
      return parsedDate >= schedStart && parsedDate <= schedEnd;
    });
    
    if (existingScheduled) {
      alert('Esta iniciativa ya está programada en este día');
      return;
    }

    const newScheduled: ScheduledInitiative = {
      id: Date.now().toString(),
      initiativeId,
      startDate,
      endDate: startDate, // Solo un día inicialmente
      hoursPerDay: {
        [startDate]: 8, // Default 8 horas
      },
    };
    setScheduledInitiatives([...scheduledInitiatives, newScheduled]);
  };

  const handleMoveScheduled = (scheduledId: string, newStartDate: string) => {
    const currentScheduled = scheduledInitiatives.find(s => s.id === scheduledId);
    if (!currentScheduled) return;

    // Verificar si ya existe otra programación de la misma iniciativa que cubra el nuevo día
    const parsedDate = parseISO(newStartDate);
    const existingScheduled = scheduledInitiatives.find((s) => {
      if (s.initiativeId !== currentScheduled.initiativeId) return false;
      if (s.id === scheduledId) return false; // Ignorar la misma programación
      
      const schedStart = parseISO(s.startDate);
      const schedEnd = parseISO(s.endDate);
      
      // Verificar si el nuevo día ya está cubierto por otra programación
      return parsedDate >= schedStart && parsedDate <= schedEnd;
    });
    
    if (existingScheduled) {
      alert('Esta iniciativa ya está programada en este día');
      return;
    }

    setScheduledInitiatives(
      scheduledInitiatives.map((s) => {
        if (s.id !== scheduledId) return s;

        const oldStart = parseISO(s.startDate);
        const oldEnd = parseISO(s.endDate);
        const newStart = parseISO(newStartDate);
        
        // Calcular días laborales de duración
        const allOldDays = eachDayOfInterval({ start: oldStart, end: oldEnd });
        const oldWorkDays = allOldDays.filter(day => !isWeekend(day));
        const durationWorkDays = oldWorkDays.length;
        
        // Calcular nueva fecha final basada en días laborales
        let newEnd = new Date(newStart);
        let workDaysAdded = 1; // Ya tenemos el día de inicio
        
        while (workDaysAdded < durationWorkDays) {
          newEnd = addDays(newEnd, 1);
          if (!isWeekend(newEnd)) {
            workDaysAdded++;
          }
        }
        
        const newEndDate = format(newEnd, 'yyyy-MM-dd');

        // Recrear hoursPerDay con nuevas fechas (solo días laborales)
        const newAllDays = eachDayOfInterval({ start: newStart, end: newEnd });
        const newWorkDays = newAllDays.filter(day => !isWeekend(day));
        
        const newHoursPerDay: { [date: string]: number } = {};
        newWorkDays.forEach((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const oldDateStr = oldWorkDays[index] ? format(oldWorkDays[index], 'yyyy-MM-dd') : null;
          newHoursPerDay[dateStr] = oldDateStr ? (s.hoursPerDay[oldDateStr] || 8) : 8;
        });

        return {
          ...s,
          startDate: newStartDate,
          endDate: newEndDate,
          hoursPerDay: newHoursPerDay,
        };
      })
    );
  };

  const handleRemoveScheduled = (scheduledId: string) => {
    setScheduledInitiatives(scheduledInitiatives.filter((s) => s.id !== scheduledId));
  };

  const handleUpdateHours = (scheduledId: string, date: string, hours: number) => {
    setScheduledInitiatives(
      scheduledInitiatives.map((s) => {
        if (s.id !== scheduledId) return s;
        return {
          ...s,
          hoursPerDay: {
            ...s.hoursPerDay,
            [date]: Math.max(0.5, Math.min(24, hours)),
          },
        };
      })
    );
  };

  const handleResizeScheduled = (scheduledId: string, newEndDate: string) => {
    setScheduledInitiatives(
      scheduledInitiatives.map((s) => {
        if (s.id !== scheduledId) return s;

        const startDate = parseISO(s.startDate);
        const endDate = parseISO(newEndDate);

        // Generar solo días laborales
        const allDays = eachDayOfInterval({ start: startDate, end: endDate });
        const workDays = allDays.filter(day => !isWeekend(day));
        const newHoursPerDay: { [date: string]: number } = {};

        workDays.forEach((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          // Mantener las horas existentes si están disponibles, de lo contrario usar 8 por defecto
          newHoursPerDay[dateStr] = s.hoursPerDay[dateStr] || 8;
        });

        return {
          ...s,
          endDate: newEndDate,
          hoursPerDay: newHoursPerDay,
        };
      })
    );
  };

  const handleCloseDay = (date: string) => {
    // Verificar si el día ya está cerrado
    if (closedDays.find(cd => cd.date === date)) {
      alert('Este día ya está cerrado');
      return;
    }

    // Calcular horas consumidas por iniciativa en ese día
    const consumedHours: { [initiativeId: string]: number } = {};
    
    scheduledInitiatives.forEach(scheduled => {
      const hours = scheduled.hoursPerDay[date];
      if (hours && hours > 0) {
        if (!consumedHours[scheduled.initiativeId]) {
          consumedHours[scheduled.initiativeId] = 0;
        }
        consumedHours[scheduled.initiativeId] += hours;
      }
    });

    const closedDay: ClosedDay = {
      date,
      closedAt: new Date().toISOString(),
      consumedHours,
    };

    setClosedDays([...closedDays, closedDay]);
  };

  const handleReopenDay = (date: string) => {
    if (window.confirm('¿Estás seguro de que quieres reabrir este día? Esto eliminará el registro de horas consumidas.')) {
      setClosedDays(closedDays.filter(cd => cd.date !== date));
    }
  };

  const openCloseInitiativeDialog = (initiative: Initiative) => {
    setClosingInitiative(initiative);
    setCloseInitiativeDialogOpen(true);
  };

  const handleCloseInitiative = () => {
    if (closingInitiative) {
      setInitiatives(initiatives.map((i) => 
        i.id === closingInitiative.id 
          ? { ...i, closedAt: new Date().toISOString() }
          : i
      ));
    }
    setCloseInitiativeDialogOpen(false);
    setClosingInitiative(null);
  };

  const handleCancelCloseInitiative = () => {
    setCloseInitiativeDialogOpen(false);
    setClosingInitiative(null);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-gray-50">
        <InitiativeList
          initiatives={initiatives}
          onCreateInitiative={() => setDialogOpen(true)}
          onDeleteInitiative={handleDeleteInitiative}
          onEditInitiative={openEditDialog}
          onCloseInitiative={openCloseInitiativeDialog}
        />
        
        {/* Contenedor principal con tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="bg-white border-b flex items-center px-4 flex-shrink-0">
            <button
              onClick={() => setActiveTab('planning')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'planning'
                  ? 'border-blue-500 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <CalendarDays className="w-5 h-5" />
              <span>Planificación</span>
            </button>
            <button
              onClick={() => setActiveTab('closed')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'closed'
                  ? 'border-blue-500 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Archive className="w-5 h-5" />
              <span>Finalizadas</span>
              {initiatives.filter(i => i.closedAt).length > 0 && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  {initiatives.filter(i => i.closedAt).length}
                </span>
              )}
            </button>
          </div>

          {/* Contenido según tab */}
          {activeTab === 'planning' ? (
            <WeeklyCalendar
              initiatives={initiatives}
              scheduledInitiatives={scheduledInitiatives}
              closedDays={closedDays}
              weekOffset={weekOffset}
              onWeekChange={setWeekOffset}
              onScheduleInitiative={handleScheduleInitiative}
              onMoveScheduled={handleMoveScheduled}
              onRemoveScheduled={handleRemoveScheduled}
              onUpdateHours={handleUpdateHours}
              onResizeScheduled={handleResizeScheduled}
              onDuplicateScheduled={handleDuplicateScheduled}
              onCloseDay={handleCloseDay}
              onReopenDay={handleReopenDay}
            />
          ) : (
            <ClosedInitiatives
              initiatives={initiatives}
              scheduledInitiatives={scheduledInitiatives}
              closedDays={closedDays}
            />
          )}
        </div>

        <InitiativeDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          onSave={handleDialogSave}
          initiative={editingInitiative}
        />
        {duplicatingScheduledId && (
          <DuplicateInitiativeDialog
            open={duplicateDialogOpen}
            onClose={handleDuplicateClose}
            onDuplicate={handleDuplicateDays}
            initiative={initiatives.find(
              i => i.id === scheduledInitiatives.find(s => s.id === duplicatingScheduledId)?.initiativeId
            ) || null}
            excludeDates={scheduledInitiatives
              .filter(s => s.initiativeId === scheduledInitiatives.find(si => si.id === duplicatingScheduledId)?.initiativeId)
              .flatMap(s => {
                const start = parseISO(s.startDate);
                const end = parseISO(s.endDate);
                return eachDayOfInterval({ start, end })
                  .filter(day => !isWeekend(day))
                  .map(day => format(day, 'yyyy-MM-dd'));
              })}
          />
        )}
        {closingInitiative && (
          <CloseInitiativeDialog
            open={closeInitiativeDialogOpen}
            initiative={closingInitiative}
            scheduledInitiatives={scheduledInitiatives}
            closedDays={closedDays}
            onClose={handleCancelCloseInitiative}
            onConfirm={handleCloseInitiative}
          />
        )}
        
        {/* Debug button - eliminar después */}
        <button
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
          className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-600 text-sm"
        >
          Limpiar datos y reiniciar
        </button>
      </div>
    </DndProvider>
  );
}

export default App;