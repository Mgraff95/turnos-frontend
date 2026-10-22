'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';

// Pestaña Equipo: alta y edición de profesionales, y el reporte de liquidación.
//
// Vive en su propio archivo porque page.js ya tiene 1335 líneas. El código
// nuevo entra acá; lo que ya existía no se mueve.

const FORM_VACIO = { nombre: '', orden: 0, telefono: '', comision_pct_default: '', activo: true };

// Primer y último día del mes en curso, que es el período que Daniela va a
// pedir casi siempre.
function mesActual() {
  const hoy = new Date();
  const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  return { desde: format(primero, 'yyyy-MM-dd'), hasta: format(ultimo, 'yyyy-MM-dd') };
}

const pesos = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-AR')}`;

export default function EquipoTab({ token, showMsg, showErr }) {
  const headers = useCallback(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const [profesionales, setProfesionales] = useState([]);
  const [nueva, setNueva] = useState(FORM_VACIO);
  const [editando, setEditando] = useState(null);

  const [periodo, setPeriodo] = useState(mesActual());
  const [profLiq, setProfLiq] = useState('');
  const [liquidacion, setLiquidacion] = useState(null);
  const [cargando, setCargando] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/profesionales/admin', headers());
      setProfesionales(res.data);
    } catch {
      showErr('No se pudieron cargar las profesionales');
    }
  }, [headers, showErr]);

  useEffect(() => { if (token) load(); }, [token, load]);

  // Solo las que cobran aparte tienen algo que liquidar. La dueña del estudio
  // (comision_pct_default null) no aparece acá.
  const liquidables = profesionales.filter(p => p.comision_pct_default !== null);

  const crear = async (e) => {
    e.preventDefault();
    if (!nueva.nombre.trim()) { showErr('Completá el nombre'); return; }
    try {
      await api.post('/api/profesionales', {
        nombre: nueva.nombre,
        orden: parseInt(nueva.orden) || 0,
        telefono: nueva.telefono || null,
        comision_pct_default: nueva.comision_pct_default === '' ? null : parseFloat(nueva.comision_pct_default),
        activo: !!nueva.activo
      }, headers());
      setNueva(FORM_VACIO);
      showMsg('Profesional creada');
      load();
    } catch (err) {
      showErr(err.response?.data?.error || 'Error al crear');
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/api/profesionales/${editando.id}`, {
        nombre: editando.nombre,
        orden: parseInt(editando.orden) || 0,
        telefono: editando.telefono || null,
        comision_pct_default: editando.comision_pct_default === '' || editando.comision_pct_default === null
          ? null
          : parseFloat(editando.comision_pct_default),
        activo: !!editando.activo
      }, headers());
      setEditando(null);
      showMsg('Profesional actualizada');
      load();
    } catch (err) {
      showErr(err.response?.data?.error || 'Error al actualizar');
    }
  };

  const pedirLiquidacion = async () => {
    if (!profLiq) { showErr('Elegí una profesional'); return; }
    setCargando(true);
    setLiquidacion(null);
    try {
      const res = await api.get('/api/admin/liquidacion', {
        ...headers(),
        params: { profesional_id: profLiq, desde: periodo.desde, hasta: periodo.hasta }
      });
      setLiquidacion(res.data);
    } catch (err) {
      showErr(err.response?.data?.error || 'Error al generar la liquidación');
    } finally {
      setCargando(false);
    }
  };

  // El texto que Daniela le manda. Se arma acá y se copia: no se envía nada
  // automáticamente.
  const textoParaCompartir = (liq) => {
    const lineas = [
      `Liquidación ${liq.profesional.nombre}`,
      `Período: ${liq.desde} al ${liq.hasta}`,
      '',
      ...liq.turnos.map(t =>
        `${format(new Date(t.fecha), 'dd/MM')} · ${t.servicio_nombre} · ${pesos(t.precio_base)} · comisión ${pesos(t.comision_monto)}`
      ),
      '',
      `Turnos: ${liq.totales.cantidad_turnos}`,
      `Facturado: ${pesos(liq.totales.facturado)}`,
      `A cobrarle: ${pesos(liq.totales.comision)}`
    ];
    return lineas.join('\n');
  };

  const copiar = async (liq) => {
    try {
      await navigator.clipboard.writeText(textoParaCompartir(liq));
      showMsg('Resumen copiado, listo para pegar en WhatsApp');
    } catch {
      showErr('No se pudo copiar');
    }
  };

  return (
    <div className="animate-fade-up">
      {/* ── Profesionales ── */}
      <div className="card mb-6">
        <h3 className="font-semibold mb-4 text-[#8B6F5E]">➕ Nueva profesional</h3>
        <form onSubmit={crear} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div>
            <label className="text-xs text-[#A89585] mb-1 block">Nombre</label>
            <input type="text" value={nueva.nombre} onChange={e => setNueva({ ...nueva, nombre: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="text-xs text-[#A89585] mb-1 block">Teléfono</label>
            <input type="text" value={nueva.telefono} onChange={e => setNueva({ ...nueva, telefono: e.target.value })} placeholder="1123456789" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-[#A89585] mb-1 block">Comisión (%)</label>
            <input type="number" value={nueva.comision_pct_default} onChange={e => setNueva({ ...nueva, comision_pct_default: e.target.value })} min="0" max="100" step="0.5" placeholder="vacío = dueña" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-[#A89585] mb-1 block">Orden</label>
            <input type="number" value={nueva.orden} onChange={e => setNueva({ ...nueva, orden: e.target.value })} className="input-field" />
          </div>
          <button type="submit" className="btn-primary">Crear</button>
        </form>
        <p className="text-xs text-[#A89585] mt-3">
          Dejá la comisión vacía si es la dueña del estudio: su facturación es del estudio y no se le liquida nada.
          Con un porcentaje, ella le cobra a la clienta y le debe esa comisión al estudio.
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {profesionales.map(p => (
          <div key={p.id} className="card">
            {editando?.id === p.id ? (
              <form onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="text-xs text-[#A89585] mb-1 block">Nombre</label>
                  <input type="text" value={editando.nombre} onChange={e => setEditando({ ...editando, nombre: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-[#A89585] mb-1 block">Teléfono</label>
                  <input type="text" value={editando.telefono ?? ''} onChange={e => setEditando({ ...editando, telefono: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-[#A89585] mb-1 block">Comisión (%)</label>
                  <input type="number" value={editando.comision_pct_default ?? ''} onChange={e => setEditando({ ...editando, comision_pct_default: e.target.value })} min="0" max="100" step="0.5" placeholder="vacío = dueña" className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-[#A89585] mb-1 block">Orden</label>
                  <input type="number" value={editando.orden} onChange={e => setEditando({ ...editando, orden: e.target.value })} className="input-field" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1">Guardar</button>
                  <button type="button" onClick={() => setEditando(null)} className="text-sm text-[#A89585] hover:underline cursor-pointer">Cancelar</button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold text-[#8B6F5E]">
                    {p.nombre}
                    {!p.activo && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#FBEAEA] text-[#C47070]">inactiva</span>}
                  </p>
                  <p className="text-sm text-[#A89585]">
                    {p.comision_pct_default === null
                      ? 'Dueña del estudio · sin comisión'
                      : `Comisión ${Number(p.comision_pct_default)}% · cobra ella`}
                    {p.telefono ? ` · ${p.telefono}` : ' · sin teléfono'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditando({ ...p, comision_pct_default: p.comision_pct_default ?? '', telefono: p.telefono ?? '' })}
                    className="text-sm text-[#E6005C] hover:underline cursor-pointer"
                  >Editar</button>
                  <button
                    onClick={async () => {
                      try {
                        await api.patch(`/api/profesionales/${p.id}`, { activo: !p.activo }, headers());
                        showMsg(p.activo ? 'Profesional desactivada' : 'Profesional reactivada');
                        load();
                      } catch { showErr('Error'); }
                    }}
                    className="text-sm text-[#A89585] hover:underline cursor-pointer"
                  >{p.activo ? 'Desactivar' : 'Reactivar'}</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {profesionales.length === 0 && <p className="text-sm text-[#A89585]">Todavía no hay profesionales cargadas.</p>}
      </div>

      {/* ── Liquidación ── */}
      <div className="card mb-6">
        <h3 className="font-semibold mb-4 text-[#8B6F5E]">💰 Liquidación</h3>
        {liquidables.length === 0 ? (
          <p className="text-sm text-[#A89585]">
            No hay profesionales con comisión configurada. Cargale un porcentaje a alguna para poder liquidarle.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-xs text-[#A89585] mb-1 block">Profesional</label>
                <select value={profLiq} onChange={e => setProfLiq(e.target.value)} className="input-field">
                  <option value="">Seleccionar...</option>
                  {liquidables.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#A89585] mb-1 block">Desde</label>
                <input type="date" value={periodo.desde} onChange={e => setPeriodo({ ...periodo, desde: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-[#A89585] mb-1 block">Hasta</label>
                <input type="date" value={periodo.hasta} onChange={e => setPeriodo({ ...periodo, hasta: e.target.value })} className="input-field" />
              </div>
              <button onClick={pedirLiquidacion} disabled={cargando} className="btn-primary">
                {cargando ? 'Generando...' : 'Generar'}
              </button>
            </div>
          </>
        )}
      </div>

      {liquidacion && (
        <div className="card">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <p className="text-xs text-[#A89585]">A cobrarle a {liquidacion.profesional.nombre}</p>
              <p className="text-3xl font-bold text-[#8B6F5E]">{pesos(liquidacion.totales.comision)}</p>
              <p className="text-xs text-[#A89585] mt-1">
                Sobre {pesos(liquidacion.totales.facturado)} facturados en {liquidacion.totales.cantidad_turnos} turno{liquidacion.totales.cantidad_turnos === 1 ? '' : 's'}
                {' · '}{liquidacion.desde} al {liquidacion.hasta}
              </p>
            </div>
            <button onClick={() => copiar(liquidacion)} className="btn-primary">Copiar resumen</button>
          </div>

          {liquidacion.totales.turnos_sin_comision_registrada > 0 && (
            <p className="text-sm text-[#C47070] mb-3">
              ⚠️ {liquidacion.totales.turnos_sin_comision_registrada} turno(s) del período no tienen comisión registrada y no suman al total.
              Son turnos anteriores a que se configurara la comisión.
            </p>
          )}

          {liquidacion.turnos.length === 0 ? (
            <p className="text-sm text-[#A89585]">No hay turnos liquidables en este período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[#A89585] border-b border-[#F5F0EB]">
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Clienta</th>
                    <th className="py-2 pr-3">Servicio</th>
                    <th className="py-2 pr-3 text-right">Cobrado</th>
                    <th className="py-2 pr-3 text-right">%</th>
                    <th className="py-2 text-right">Comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {liquidacion.turnos.map(t => (
                    <tr key={t.id} className="border-b border-[#F5F0EB] last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{format(new Date(t.fecha), 'dd/MM/yyyy')}</td>
                      <td className="py-2 pr-3">{t.cliente_nombre} {t.cliente_apellido}</td>
                      <td className="py-2 pr-3">{t.servicio_nombre}</td>
                      <td className="py-2 pr-3 text-right">{t.precio_base === null ? '—' : pesos(t.precio_base)}</td>
                      <td className="py-2 pr-3 text-right">{t.comision_pct === null ? '—' : `${t.comision_pct}%`}</td>
                      <td className="py-2 text-right font-medium">{t.comision_monto === null ? '—' : pesos(t.comision_monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-[#A89585] mt-4">
            Los montos son los que se congelaron al reservar cada turno: cambiar el precio de un servicio hoy no altera esta liquidación.
          </p>
        </div>
      )}
    </div>
  );
}
