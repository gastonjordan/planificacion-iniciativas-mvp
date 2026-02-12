import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Initiative } from '../types';
import { format, addDays, startOfWeek, isWeekend } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react';

interface DuplicateInitiativeDialogProps {
  open: boolean;
  onClose: () => void;
  onDuplicate: (selectedDates: { date: string; hours: number }[]) => void;
  initiative: Initiative | null;
  excludeDates: string[]; // Fechas que ya están ocupadas por esta iniciativa
}

export function DuplicateInitiativeDialog({
  open,
  onClose,
  onDuplicate,
  initiative,
  excludeDates,
}: DuplicateInitiativeDialogProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDays, setSelectedDays] = useState<{ [date: string]: boolean }>({});
  const [hoursPerDay, setHoursPerDay] = useState<{ [date: string]: number }>({});
  const [defaultHours, setDefaultHours] = useState(8);

  // Resetear cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      setWeekOffset(0);
      setSelectedDays({});
      setHoursPerDay({});
      setDefaultHours(8);
    }
  }, [open]);

  if (!initiative) return null;

  // Calcular el inicio de la semana actual + offset
  const today = new Date();
  const baseWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Lunes
  const currentWeekStart = addDays(baseWeekStart, weekOffset * 7);

  // Generar 4 semanas de días laborables
  const weeks: Date[][] = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = addDays(currentWeekStart, w * 7);
    const weekDays: Date[] = [];
    for (let d = 0; d < 5; d++) {
      weekDays.push(addDays(weekStart, d));
    }
    weeks.push(weekDays);
  }

  const handleToggleDay = (dateStr: string) => {
    setSelectedDays((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
    
    // Si se selecciona un día y no tiene horas configuradas, usar el valor por defecto
    if (!selectedDays[dateStr] && !hoursPerDay[dateStr]) {
      setHoursPerDay((prev) => ({
        ...prev,
        [dateStr]: defaultHours,
      }));
    }
  };

  const handleHoursChange = (dateStr: string, hours: number) => {
    setHoursPerDay((prev) => ({
      ...prev,
      [dateStr]: Math.max(0, Math.min(24, hours)),
    }));
  };

  const handleApplyDefaultHours = () => {
    const updated: { [date: string]: number } = {};
    Object.keys(selectedDays).forEach((dateStr) => {
      if (selectedDays[dateStr]) {
        updated[dateStr] = defaultHours;
      }
    });
    setHoursPerDay((prev) => ({ ...prev, ...updated }));
  };

  const handleSelectWeek = (weekDays: Date[]) => {
    const updated: { [date: string]: boolean } = { ...selectedDays };
    const updatedHours: { [date: string]: number } = { ...hoursPerDay };
    
    weekDays.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const isExcluded = excludeDates.includes(dateStr);
      const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
      
      if (!isExcluded && !isPast) {
        updated[dateStr] = true;
        if (!updatedHours[dateStr]) {
          updatedHours[dateStr] = defaultHours;
        }
      }
    });
    
    setSelectedDays(updated);
    setHoursPerDay(updatedHours);
  };

  const handleDeselectWeek = (weekDays: Date[]) => {
    const updated: { [date: string]: boolean } = { ...selectedDays };
    
    weekDays.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      updated[dateStr] = false;
    });
    
    setSelectedDays(updated);
  };

  const isWeekSelected = (weekDays: Date[]): boolean => {
    return weekDays.every((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const isExcluded = excludeDates.includes(dateStr);
      const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
      
      if (isExcluded || isPast) return true; // Ignorar días no disponibles
      return selectedDays[dateStr] === true;
    });
  };

  const handleDuplicate = () => {
    const selectedDates = Object.entries(selectedDays)
      .filter(([_, isSelected]) => isSelected)
      .map(([date]) => ({
        date,
        hours: hoursPerDay[date] || defaultHours,
      }));

    if (selectedDates.length === 0) {
      alert('Por favor selecciona al menos un día');
      return;
    }

    onDuplicate(selectedDates);
    onClose();
  };

  const selectedCount = Object.values(selectedDays).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Duplicar iniciativa: {initiative.name}
          </DialogTitle>
          <DialogDescription>
            Selecciona los días donde quieres programar esta iniciativa y configura las horas para cada uno
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Control de horas por defecto */}
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border">
            <Label className="text-sm font-medium">Horas por defecto:</Label>
            <Input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={defaultHours}
              onChange={(e) => setDefaultHours(parseFloat(e.target.value) || 0)}
              className="w-20"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplyDefaultHours}
              disabled={selectedCount === 0}
            >
              Aplicar a seleccionados ({selectedCount})
            </Button>
          </div>

          {/* Navegación de semanas */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset(weekOffset - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm font-medium">
              {format(currentWeekStart, "'Semana del' d 'de' MMMM yyyy", { locale: es })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset(weekOffset + 1)}
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Calendario de 4 semanas */}
          <div className="space-y-3">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-gray-500">
                    Semana {weekIndex + 1 + (weekOffset * 4)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      if (isWeekSelected(week)) {
                        handleDeselectWeek(week);
                      } else {
                        handleSelectWeek(week);
                      }
                    }}
                  >
                    {isWeekSelected(week) ? 'Deseleccionar semana' : 'Seleccionar semana'}
                  </Button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {week.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isExcluded = excludeDates.includes(dateStr);
                    const isSelected = selectedDays[dateStr] || false;
                    const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

                    return (
                      <div
                        key={dateStr}
                        className={`p-3 border rounded-lg ${
                          isExcluded || isPast
                            ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                            : isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:bg-gray-50 cursor-pointer'
                        }`}
                        onClick={() => !isExcluded && !isPast && handleToggleDay(dateStr)}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <Checkbox
                            checked={isSelected}
                            disabled={isExcluded || isPast}
                            onCheckedChange={() => !isExcluded && !isPast && handleToggleDay(dateStr)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <div className="text-xs font-medium">
                              {format(day, 'EEE', { locale: es })}
                            </div>
                            <div className="text-sm font-semibold">
                              {format(day, 'd MMM', { locale: es })}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div
                            className="flex items-center gap-1 mt-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              value={hoursPerDay[dateStr] || defaultHours}
                              onChange={(e) =>
                                handleHoursChange(dateStr, parseFloat(e.target.value) || 0)
                              }
                              className="h-8 text-sm"
                            />
                            <span className="text-xs text-gray-500">hs</span>
                          </div>
                        )}

                        {isExcluded && (
                          <div className="text-xs text-gray-500 mt-1">Ya programado</div>
                        )}
                        {isPast && !isExcluded && (
                          <div className="text-xs text-gray-500 mt-1">Pasado</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleDuplicate} disabled={selectedCount === 0}>
            Duplicar en {selectedCount} {selectedCount === 1 ? 'día' : 'días'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}