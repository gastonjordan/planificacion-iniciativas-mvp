import { Plus, Trash2, GripVertical, Edit2, CheckCircle, Lock } from 'lucide-react';
import { Button } from './ui/button';
import { Initiative } from '../types';
import { useDrag } from 'react-dnd';
import * as Icons from 'lucide-react';
import { useRef } from 'react';

interface InitiativeListProps {
  initiatives: Initiative[];
  onCreateInitiative: () => void;
  onDeleteInitiative: (id: string) => void;
  onEditInitiative: (initiative: Initiative) => void;
  onCloseInitiative: (initiative: Initiative) => void;
}

function InitiativeItem({ 
  initiative, 
  onDelete, 
  onEdit,
  onClose
}: { 
  initiative: Initiative; 
  onDelete: (id: string) => void;
  onEdit: (initiative: Initiative) => void;
  onClose: (initiative: Initiative) => void;
}) {
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const isClosed = !!initiative.closedAt;
  
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'INITIATIVE',
    item: { initiativeId: initiative.id },
    canDrag: !isClosed, // No permitir drag si está cerrada
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [initiative.id, isClosed]);

  // Conectar el drag solo al handle
  drag(dragHandleRef);

  const IconComponent = initiative.icon 
    ? (Icons[initiative.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>)
    : null;

  return (
    <div
      ref={preview}
      className={`flex items-center gap-2 p-3 bg-white border rounded-lg hover:shadow-md transition-shadow group ${
        isClosed ? 'opacity-60 bg-gray-50 cursor-pointer' : ''
      }`}
      style={{ opacity: isDragging ? 0.5 : isClosed ? 0.7 : 1 }}
      onClick={(e) => {
        // Si está cerrada, abrir el diálogo de resumen al hacer clic en cualquier parte
        if (isClosed) {
          e.stopPropagation();
          onClose(initiative);
        }
      }}
      title={isClosed ? 'Ver resumen de iniciativa' : ''}
    >
      <div 
        ref={dragHandleRef}
        className={`p-1 -ml-1 rounded transition-colors ${
          isClosed 
            ? 'cursor-not-allowed opacity-50' 
            : 'cursor-grab active:cursor-grabbing hover:bg-gray-100'
        }`}
        title={isClosed ? 'Iniciativa finalizada' : 'Arrastrar al calendario'}
      >
        <GripVertical className="w-5 h-5 text-gray-500" />
      </div>
      
      {IconComponent ? (
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: initiative.color + '20' }}
        >
          <IconComponent className="w-5 h-5" style={{ color: initiative.color }} />
        </div>
      ) : (
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: initiative.color }}
        />
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{initiative.name}</p>
          {isClosed && (
            <span className="flex-shrink-0 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              Finalizada
            </span>
          )}
        </div>
        {initiative.description && (
          <p className="text-sm text-gray-500 truncate">{initiative.description}</p>
        )}
        {initiative.estimatedHours && (
          <p className="text-xs text-gray-400 mt-0.5">
            {initiative.estimatedHours}h estimadas
          </p>
        )}
      </div>
      
      {!isClosed && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(initiative);
            }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Editar iniciativa"
          >
            <Edit2 className="w-4 h-4 text-blue-500" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`¿Estás seguro de que quieres eliminar "${initiative.name}"?`)) {
                onDelete(initiative.id);
              }
            }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Eliminar iniciativa"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClose(initiative);
            }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Finalizar iniciativa"
          >
            <CheckCircle className="w-4 h-4 text-green-500" />
          </Button>
        </>
      )}
      
      {isClosed && (
        <div className="flex-shrink-0" title="Iniciativa finalizada">
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>
      )}
    </div>
  );
}

export function InitiativeList({ initiatives, onCreateInitiative, onDeleteInitiative, onEditInitiative, onCloseInitiative }: InitiativeListProps) {
  return (
    <div className="w-80 border-r bg-gray-50 p-4 flex flex-col h-screen">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-3">Iniciativas</h2>
        <Button onClick={onCreateInitiative} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Iniciativa
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {initiatives.length === 0 ? (
          <p className="text-sm text-gray-500 text-center mt-8">
            No hay iniciativas. Crea una para comenzar.
          </p>
        ) : (
          initiatives.map((initiative) => (
            <InitiativeItem
              key={initiative.id}
              initiative={initiative}
              onDelete={onDeleteInitiative}
              onEdit={onEditInitiative}
              onClose={onCloseInitiative}
            />
          ))
        )}
      </div>
    </div>
  );
}