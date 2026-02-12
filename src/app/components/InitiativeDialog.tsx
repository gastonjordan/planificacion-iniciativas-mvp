import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Initiative } from '../types';
import * as Icons from 'lucide-react';

interface InitiativeDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (initiative: Omit<Initiative, 'id'>) => void;
  initiative?: Initiative;
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
];

const AVAILABLE_ICONS = [
  'Briefcase', 'Code', 'Rocket', 'Target', 'TrendingUp',
  'Zap', 'Star', 'Award', 'Flag', 'CheckCircle',
  'Lightbulb', 'Users', 'Calendar', 'Bookmark', 'Heart',
  'Settings', 'Database', 'Globe', 'Package', 'Cpu'
];

export function InitiativeDialog({ open, onClose, onSave, initiative }: InitiativeDialogProps) {
  const [name, setName] = useState(initiative?.name || '');
  const [description, setDescription] = useState(initiative?.description || '');
  const [color, setColor] = useState(initiative?.color || COLORS[0]);
  const [icon, setIcon] = useState(initiative?.icon || 'Briefcase');
  const [estimatedHours, setEstimatedHours] = useState<string>(initiative?.estimatedHours?.toString() || '');

  useEffect(() => {
    if (initiative) {
      setName(initiative.name);
      setDescription(initiative.description || '');
      setColor(initiative.color);
      setIcon(initiative.icon || 'Briefcase');
      setEstimatedHours(initiative.estimatedHours?.toString() || '');
    } else {
      setName('');
      setDescription('');
      setColor(COLORS[0]);
      setIcon('Briefcase');
      setEstimatedHours('');
    }
  }, [initiative, open]);

  const handleSave = () => {
    if (!name.trim()) return;
    const hours = estimatedHours ? parseFloat(estimatedHours) : undefined;
    onSave({ 
      name, 
      description, 
      color, 
      icon, 
      estimatedHours: hours && !isNaN(hours) && hours > 0 ? hours : undefined 
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initiative ? 'Editar Iniciativa' : 'Nueva Iniciativa'}</DialogTitle>
          <DialogDescription>
            {initiative ? 'Modifica los detalles de la iniciativa.' : 'Crea una nueva iniciativa para tu plan de trabajo.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la iniciativa"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe la iniciativa"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? '#000' : 'transparent',
                    transform: color === c ? 'scale(1.1)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Icono</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_ICONS.map((iconName) => {
                const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
                return (
                  <button
                    key={iconName}
                    onClick={() => setIcon(iconName)}
                    className="w-10 h-10 rounded-lg border-2 transition-all flex items-center justify-center"
                    style={{
                      backgroundColor: icon === iconName ? color + '30' : 'transparent',
                      borderColor: icon === iconName ? color : '#d1d5db',
                    }}
                  >
                    <IconComponent className="w-5 h-5" style={{ color: color }} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimatedHours">Horas Estimadas (opcional)</Label>
            <Input
              id="estimatedHours"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="Horas estimadas para la iniciativa"
              type="number"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}