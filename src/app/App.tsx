import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { InitiativeList } from './components/InitiativeList';
import { InitiativeDialog } from './components/InitiativeDialog';
import { DuplicateInitiativeDialog } from './components/DuplicateInitiativeDialog';
import { CloseInitiativeDialog } from './components/CloseInitiativeDialog';
import { WeeklyCalendar } from './components/WeeklyCalendar';
import { ClosedInitiatives } from './components/ClosedInitiatives';
import { Initiative, ScheduledInitiative, ClosedDay } from './types';
import { format, parseISO, eachDayOfInterval, addDays, isWeekend } from 'date-fns';
import { CalendarDays, Archive } from 'lucide-react';


function App() {
const handleCancelCloseInitiative = () => {
  setCloseInitiativeDialogOpen(false);
  setClosingInitiative(null);
};
  

const [initiatives, setInitiatives] = useState<Initiative[]>([]);
const [scheduledInitiatives, setScheduledInitiatives] = useState<ScheduledInitiative[]>([]);
const [closedDays, setClosedDays] = useState<ClosedDay[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState<Initiative | undefined>(undefined);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicatingScheduledId, setDuplicatingScheduledId] = useState<string | null>(null);
  const [closeInitiativeDialogOpen, setCloseInitiativeDialogOpen] = useState(false);
  const [closingInitiative, setClosingInitiative] = useState<Initiative | null>(null);
  const [activeTab, setActiveTab] = useState<'planning' | 'closed'>('planning');

const handleCreateInitiative = async (data: Omit<Initiative, 'id'>) => {
const { data: inserted, error } = await supabase
  .from("initiatives")
  .insert([{
    name: (data as any).name,
    description: (data as any).description,
    color: (data as any).color,
    icon: (data as any).icon ?? null,

estimated_hours: (data as any).estimatedHours ?? 0,

  }])
  .select()
  .single();


  if (error) {
    console.error("Error creating initiative:", error);
    alert("No se pudo guardar la iniciativa en la base.");
    return;
  }

  // Inserted trae {id, name, description, color, created_at}
  // Lo adaptamos a tu tipo Initiative (si tiene más campos, los dejamos en undefined)
  const newInitiative: Initiative = {
    ...(data as any),
    id: inserted.id,
    name: inserted.name,
    description: inserted.description,
    color: inserted.color,
estimated_hours: (data as any).estimatedHours ?? 0,

  };

  setInitiatives([...initiatives, newInitiative]);
};


const handleEditInitiative = async (id: string, data: Omit<Initiative, "id">) => {
  
const { error } = await supabase
    .from("initiatives")
    .update({
      name: (data as any).name,
      description: (data as any).description,
      color: (data as any).color,
      icon: (data as any).icon ?? null,
estimated_hours: (data as any).estimatedHours ?? 0,

      // no tocamos closed_at acá
    })
    .eq("id", id);


  if (error) {
    console.error("Error updating initiative:", error);
    alert("No se pudo guardar la edición en la base.");
    return;
  }

  // si DB ok, recién ahí actualizamos estado local
  setInitiatives(initiatives.map((i) => (i.id === id ? { ...i, ...data } : i)));
};


const handleDeleteInitiative = async (id: string) => {
  // 1) borrar en base (scheduled primero por si no aplica cascade)
  const { error: schedErr } = await supabase
    .from("scheduled_initiatives")
    .delete()
    .eq("initiative_id", id);

  if (schedErr) {
    console.error("Error deleting scheduled initiatives:", schedErr);
    alert("No se pudo borrar la planificación de la iniciativa en la base.");
    return;
  }

  const { error: initErr } = await supabase
    .from("initiatives")
    .delete()
    .eq("id", id);

  if (initErr) {
    console.error("Error deleting initiative:", initErr);
    alert("No se pudo borrar la iniciativa en la base.");
    return;
  }

  // 2) actualizar estado local
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

const handleDuplicateDays = async (selectedDates: { date: string; hours: number }[]) => {
  if (!duplicatingScheduledId) return;

  const scheduled = scheduledInitiatives.find(s => s.id === duplicatingScheduledId);
  if (!scheduled) return;

  // armamos inserts para Supabase (batch)
  const rowsToInsert = selectedDates.map(({ date, hours }) => ({
    initiative_id: scheduled.initiativeId,
    start_date: date,
    end_date: date,
    hours_per_day: { [date]: hours },
  }));

  const { data: inserted, error } = await supabase
    .from("scheduled_initiatives")
    .insert(rowsToInsert)
    .select();

  if (error) {
    console.error("Error duplicating scheduled days:", error);
    alert("No se pudieron duplicar los días en la base.");
    return;
  }

  // mapeamos lo insertado a tu tipo local
  const mapped: ScheduledInitiative[] = (inserted ?? []).map((row: any) => ({
    id: row.id,
    initiativeId: row.initiative_id,
startDate: String(row.start_date).slice(0, 10),
endDate: String(row.end_date).slice(0, 10),

    hoursPerDay: row.hours_per_day ?? {},
  }));

  setScheduledInitiatives(prev => [...prev, ...mapped]);
};


  const handleDuplicateClose = () => {
    setDuplicateDialogOpen(false);
    setDuplicatingScheduledId(null);
  };

const handleScheduleInitiative = async (initiativeId: string, startDate: string) => {
  // Verificar si la iniciativa ya está programada en ese día
  const parsedDate = parseISO(startDate);
  const existingScheduled = scheduledInitiatives.find((s) => {
    if (s.initiativeId !== initiativeId) return false;

    const schedStart = parseISO(s.startDate);
    const schedEnd = parseISO(s.endDate);

    return parsedDate >= schedStart && parsedDate <= schedEnd;
  });

  if (existingScheduled) {
    alert("Esta iniciativa ya está programada en este día");
    return;
  }

  const hoursPerDay = { [startDate]: 8 };

  // 1) Guardar en Supabase
  const { data: inserted, error } = await supabase
    .from("scheduled_initiatives")
    .insert([{
      initiative_id: initiativeId,
      start_date: startDate,
      end_date: startDate,
      hours_per_day: hoursPerDay,
    }])
    .select()
    .single();

  if (error) {
    console.error("Error scheduling initiative:", error);
    alert("No se pudo guardar la planificación en la base.");
    return;
  }

  // 2) Actualizar estado local con el ID real de Supabase
  const newScheduled: ScheduledInitiative = {
    id: inserted.id,
    initiativeId: inserted.initiative_id,
startDate: String(inserted.start_date).slice(0, 10),
endDate: String(inserted.end_date).slice(0, 10),

    hoursPerDay: inserted.hours_per_day ?? {},
  };

  setScheduledInitiatives([...scheduledInitiatives, newScheduled]);
};


const handleMoveScheduled = async (scheduledId: string, newStartDate: string) => {
  const current = scheduledInitiatives.find(s => s.id === scheduledId);
  if (!current) return;

  // (tu validación de "ya existe otra planificación ese día" puede quedarse)

  // recalcular endDate + hoursPerDay (lo que ya tenías)
  const oldStart = parseISO(current.startDate);
  const oldEnd = parseISO(current.endDate);
  const newStart = parseISO(newStartDate);

  const allOldDays = eachDayOfInterval({ start: oldStart, end: oldEnd });
  const oldWorkDays = allOldDays.filter(day => !isWeekend(day));
  const durationWorkDays = oldWorkDays.length;

  let newEnd = new Date(newStart);
  let workDaysAdded = 1;
  while (workDaysAdded < durationWorkDays) {
    newEnd = addDays(newEnd, 1);
    if (!isWeekend(newEnd)) workDaysAdded++;
  }
  const newEndDate = format(newEnd, "yyyy-MM-dd");

  const newAllDays = eachDayOfInterval({ start: newStart, end: newEnd });
  const newWorkDays = newAllDays.filter(day => !isWeekend(day));

  const newHoursPerDay: Record<string, number> = {};
  newWorkDays.forEach((day, index) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const oldDateStr = oldWorkDays[index] ? format(oldWorkDays[index], "yyyy-MM-dd") : null;
    newHoursPerDay[dateStr] = oldDateStr ? (current.hoursPerDay[oldDateStr] || 8) : 8;
  });

  // ✅ update DB
  const { error } = await supabase
    .from("scheduled_initiatives")
    .update({
      start_date: newStartDate,
      end_date: newEndDate,
      hours_per_day: newHoursPerDay,
    })
    .eq("id", scheduledId);

  if (error) {
    console.error("Error moving scheduled:", error);
    alert("No se pudo mover la planificación en la base.");
    return;
  }

  // ✅ update local
  setScheduledInitiatives(prev =>
    prev.map(s => s.id === scheduledId ? {
      ...s,
      startDate: newStartDate,
      endDate: newEndDate,
      hoursPerDay: newHoursPerDay,
    } : s)
  );
};

const handleRemoveScheduled = async (scheduledId: string) => {
  const { error } = await supabase
    .from("scheduled_initiatives")
    .delete()
    .eq("id", scheduledId);

  if (error) {
    console.error("Error deleting scheduled:", error);
    alert("No se pudo borrar la planificación en la base.");
    return;
  }

  setScheduledInitiatives((prev) => prev.filter((s) => s.id !== scheduledId));
};


const handleUpdateHours = async (scheduledId: string, date: string, hours: number) => {
 console.log("HANDLE UPDATE HOURS CALLED:", { scheduledId, date, hours });
  const safeHours = Math.max(0.5, Math.min(24, hours));

  const current = scheduledInitiatives.find((s) => s.id === scheduledId);
  if (!current) return;

  const updatedHoursPerDay = {
    ...current.hoursPerDay,
    [date]: safeHours,
  };

console.log("UPDATING HOURS DB:", { scheduledId, date, safeHours, updatedHoursPerDay });

  // Guardar en Supabase
  const { error } = await supabase
    .from("scheduled_initiatives")
    .update({ hours_per_day: updatedHoursPerDay })
    .eq("id", scheduledId);

console.log("UPDATE RESULT:", error ?? "OK");

  if (error) {
    console.error("Error saving hours:", error);
    alert("No se pudieron guardar las horas en la base.");
    return;
  }

  // Actualizar estado local
  setScheduledInitiatives(
    scheduledInitiatives.map((s) =>
      s.id === scheduledId ? { ...s, hoursPerDay: updatedHoursPerDay } : s
    )
  );
};

const handleResizeScheduled = async (scheduledId: string, newEndDate: string) => {
  const current = scheduledInitiatives.find(s => s.id === scheduledId);
  if (!current) return;

  const startDate = parseISO(current.startDate);
  const endDate = parseISO(newEndDate);

  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  const workDays = allDays.filter(day => !isWeekend(day));
  const newHoursPerDay: Record<string, number> = {};

  workDays.forEach((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    newHoursPerDay[dateStr] = current.hoursPerDay[dateStr] || 8;
  });

  const { error } = await supabase
    .from("scheduled_initiatives")
    .update({ end_date: newEndDate, hours_per_day: newHoursPerDay })
    .eq("id", scheduledId);

  if (error) {
    console.error("Error resizing scheduled:", error);
    alert("No se pudo actualizar el rango en la base.");
    return;
  }

  setScheduledInitiatives(prev =>
    prev.map(s => s.id === scheduledId ? { ...s, endDate: newEndDate, hoursPerDay: newHoursPerDay } : s)
  );
};


const handleCloseDay = async (date: string) => {
  if (closedDays.find(cd => cd.date === date)) {
    alert("Este día ya está cerrado");
    return;
  }



  const consumedHours: Record<string, number> = {};
  scheduledInitiatives.forEach(scheduled => {
    const h = scheduled.hoursPerDay[date];
    if (h && h > 0) {
      consumedHours[scheduled.initiativeId] = (consumedHours[scheduled.initiativeId] || 0) + h;
    }
  });

  const { data, error } = await supabase
    .from("closed_days")
    .insert([{ date, consumed_hours: consumedHours }])
    .select()
    .single();

  if (error) {
    console.error("Error closing day:", error);
    alert("No se pudo cerrar el día en la base.");
    return;
  }

  setClosedDays(prev => [...prev, {
    id: data.id,
   date: String(data.date).slice(0, 10),

    closedAt: data.closed_at,
    consumedHours: data.consumed_hours ?? {},
  }]);
};

const handleReopenDay = async (date: string) => {
  // borrar en DB
  const { error } = await supabase
    .from("closed_days")
    .delete()
    .eq("date", date);

  if (error) {
    console.error("Error reopening day:", error);
    alert("No se pudo reabrir el día en la base.");
    return;
  }

  // borrar en estado local
  setClosedDays((prev) => prev.filter((d) => d.date !== date));
};

  const openCloseInitiativeDialog = (initiative: Initiative) => {
    setClosingInitiative(initiative);
    setCloseInitiativeDialogOpen(true);
  };

const handleCloseInitiative = async () => {
  if (!closingInitiative) return;

  const closedAt = new Date().toISOString();

  const { error } = await supabase
    .from("initiatives")
    .update({ closed_at: closedAt })
    .eq("id", closingInitiative.id);

  if (error) {
    console.error("Error closing initiative:", error);
    alert("No se pudo finalizar la iniciativa en la base.");
    return;
  }

  setInitiatives(
    initiatives.map((i) =>
      i.id === closingInitiative.id ? { ...i, closedAt } : i
    )
  );

  setCloseInitiativeDialogOpen(false);
  setClosingInitiative(null);
};



useEffect(() => {
  const loadData = async () => {
    // initiatives
    const { data: initiativesData, error: initiativesError } = await supabase
      .from("initiatives")
      .select("*")
      .order("created_at", { ascending: true });

    if (initiativesError) {
      console.error("Error loading initiatives:", initiativesError);
    } else {
      const mapped = (initiativesData ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? "",
        color: row.color ?? "#ef4444",
        icon: row.icon ?? null,
        closedAt: row.closed_at ?? null,
estimatedHours: row.estimated_hours ?? 0,

      }));
      setInitiatives(mapped);
    }

    // scheduled_initiatives
    const { data: scheduledData, error: scheduledError } = await supabase
      .from("scheduled_initiatives")
      .select("*")
      .order("created_at", { ascending: true });

    if (scheduledError) {
      console.error("Error loading scheduled:", scheduledError);
    } else {
      const mapped = (scheduledData ?? []).map((row: any) => ({
        id: row.id,
        initiativeId: row.initiative_id,
 startDate: String(row.start_date).slice(0, 10),
endDate: String(row.end_date).slice(0, 10),

        hoursPerDay: row.hours_per_day ?? {},
      }));
      setScheduledInitiatives(mapped);
    }

    // closed_days
    const { data: closedDaysData, error: closedDaysError } = await supabase
      .from("closed_days")
      .select("*")
      .order("date", { ascending: true });

    if (closedDaysError) {
      console.error("Error loading closed_days:", closedDaysError);
    } else {
      const mapped = (closedDaysData ?? []).map((row: any) => ({
        id: row.id,
       date: String(row.date).slice(0, 10),

        closedAt: row.closed_at,
        consumedHours: row.consumed_hours ?? {},
      }));
      setClosedDays(mapped);
    }
  };

  loadData();
}, []);

const handleResetAllData = async () => {
  const ok = window.confirm(
    "Esto va a BORRAR todo en la base (initiatives, scheduled_initiatives y closed_days). ¿Continuar?"
  );
  if (!ok) return;

  try {
    // 1) borrar planning
    const { error: e1 } = await supabase
      .from("scheduled_initiatives")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // borra todo

    if (e1) throw e1;

    // 2) borrar días cerrados
    const { error: e2 } = await supabase
      .from("closed_days")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // borra todo

    if (e2) throw e2;

    // 3) borrar iniciativas
    const { error: e3 } = await supabase
      .from("initiatives")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // borra todo

    if (e3) throw e3;

    // 4) limpiar state (para que se vea instantáneo)
    setScheduledInitiatives([]);
    setClosedDays([]);
    setInitiatives([]);

    // 5) refrescar UI
    window.location.reload();
  } catch (err) {
    console.error("Reset error:", err);
    alert("No se pudo limpiar la base. Mirá la consola para ver el error exacto.");
  }
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
  onClick={handleResetAllData}
  className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-600 text-sm"
>
  Limpiar datos y reiniciar
</button>


      </div>
    </DndProvider>
  );
}

export default App;