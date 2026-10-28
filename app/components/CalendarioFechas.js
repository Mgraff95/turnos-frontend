'use client';

import { useState } from 'react';
import { format, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

// Calendario mensual para elegir una fecha de turno.
//
// Vive acá y no dentro de una página porque lo usan dos: /reservar (turno nuevo)
// y /mistura (cambiar la fecha de un turno existente). Tenerlo duplicado era
// pedir que un arreglo se aplicara en un solo lado.
//
// Sin tope hacia adelante: se navega mes a mes hasta donde se quiera. Hacia
// atrás no se pasa del mes actual.

// Hay que reservar con al menos esta anticipación. El backend valida lo mismo
// slot por slot; acá se apagan los días que ya no tienen ningún turno posible.
const HORAS_MINIMAS = 24;

// getDay() de JS es 0=domingo; la base usa 0=lunes.
const diaJsToDB = (jsDay) => (jsDay === 0 ? 6 : jsDay - 1);

export default function CalendarioFechas({ rangos = [], bloqueosDiaCompleto = [], onElegir }) {
  const hoy = startOfToday();
  const [mesVisible, setMesVisible] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1));

  // En un inicializador y no en el render: leer el reloj durante el render es
  // impuro y React lo marca. Queda fijo mientras la clienta tiene la pantalla
  // abierta, lo cual alcanza porque la lista de horarios la filtra el backend
  // con la hora real de cada pedido.
  const [limiteMinimo] = useState(() => new Date(Date.now() + HORAS_MINIMAS * 60 * 60 * 1000));

  // Los rangos que aplican a un día concreto. Espeja rangosQueAplican del
  // backend: si hay excepción para esa fecha, la excepción REEMPLAZA al horario
  // semanal. Una excepción en domingo abre ESE domingo, no todos los domingos.
  const rangosDelDia = (dia, fechaStr) => {
    const excepciones = rangos.filter(
      h => h.fecha && String(h.fecha).split('T')[0] === fechaStr
    );
    if (excepciones.length > 0) return excepciones;
    return rangos.filter(h => !h.fecha && h.dia_semana === diaJsToDB(dia.getDay()));
  };

  const diaSeleccionable = (dia) => {
    const fechaStr = format(dia, 'yyyy-MM-dd');

    // Sin rangos ese día no se atiende: cubre tanto el día de semana cerrado
    // como la ausencia de excepción.
    const delDia = rangosDelDia(dia, fechaStr);
    if (delDia.length === 0) return false;

    if (bloqueosDiaCompleto.includes(fechaStr)) return false;

    // Contra el CIERRE REAL del día, no contra las 23:59. Si el estudio cierra
    // a las 17:00, un día cuyo cierre ya cae dentro de la ventana no tiene
    // ningún turno posible, y mostrarlo habilitado para que al tocarlo aparezca
    // vacío es peor que apagarlo.
    const ultimoCierre = delDia.map(r => r.hora_fin).sort().pop();
    const [hh, mm] = ultimoCierre.split(':').map(Number);
    const cierre = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), hh, mm);
    return cierre > limiteMinimo;
  };

  // Grilla del mes, arrancando en lunes. Los null son los huecos previos al día 1.
  const celdas = (() => {
    const primero = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
    const ultimo = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0);
    const hueco = diaJsToDB(primero.getDay());
    const salida = Array.from({ length: hueco }, () => null);
    for (let d = 1; d <= ultimo.getDate(); d++) {
      salida.push(new Date(mesVisible.getFullYear(), mesVisible.getMonth(), d));
    }
    return salida;
  })();

  const puedeMesAnterior = mesVisible > new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setMesVisible(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          disabled={!puedeMesAnterior}
          aria-label="Mes anterior"
          className="w-9 h-9 rounded-lg border border-[#F5D9E4] text-[#E6005C] text-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-default hover:border-[#E6005C] cursor-pointer">‹</button>
        <p className="font-semibold text-[#3A3A3A] capitalize">
          {format(mesVisible, 'MMMM yyyy', { locale: es })}
        </p>
        <button
          onClick={() => setMesVisible(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          aria-label="Mes siguiente"
          className="w-9 h-9 rounded-lg border border-[#F5D9E4] text-[#E6005C] text-lg flex items-center justify-center hover:border-[#E6005C] cursor-pointer">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <p key={i} className="text-center text-xs text-[#8A8580] py-1">{d}</p>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celdas.map((dia, i) => {
          if (!dia) return <div key={`v${i}`} />;
          const fechaStr = format(dia, 'yyyy-MM-dd');
          const habilitado = diaSeleccionable(dia);
          return (
            <button
              key={fechaStr}
              onClick={() => habilitado && onElegir(fechaStr)}
              disabled={!habilitado}
              className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                habilitado
                  ? 'bg-white border border-[#F5D9E4] text-[#3A3A3A] hover:border-[#E6005C] hover:bg-[#FDEFF5] cursor-pointer'
                  : 'text-[#D9D4D0] cursor-not-allowed'
              }`}>
              {format(dia, 'd')}
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-[#8A8580] mt-3">
        Los turnos se reservan con al menos {HORAS_MINIMAS} horas de anticipación.
      </p>
    </div>
  );
}
