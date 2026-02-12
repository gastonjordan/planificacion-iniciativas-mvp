export interface Initiative {
  id: string;
  name: string;
  color: string;
  description?: string;
  icon?: string; // Nombre del icono de lucide-react
  estimatedHours?: number; // Horas estimadas totales para la iniciativa
  closedAt?: string; // ISO timestamp - cuando se finalizó la iniciativa
}

export interface ScheduledInitiative {
  id: string;
  initiativeId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  hoursPerDay: { [date: string]: number }; // hours allocated per day
}

export interface ClosedDay {
  date: string; // ISO date string (yyyy-MM-dd)
  closedAt: string; // ISO timestamp
  consumedHours: { [initiativeId: string]: number }; // hours consumed per initiative
}