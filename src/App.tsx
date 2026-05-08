/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User, CheckCircle, AlertCircle, ArrowRight, Play } from 'lucide-react';

// Escala GROC Modificada (+3 a -3)
const GROC_SCALE = [
  { value: 3, label: "Mucho mejor", color: "bg-green-600 hover:bg-green-700" },
  { value: 2, label: "Un poco mejor", color: "bg-green-400 hover:bg-green-500" },
  { value: 1, label: "Casi nada mejor", color: "bg-green-200 hover:bg-green-300 text-black" },
  { value: 0, label: "Sin cambios", color: "bg-gray-300 hover:bg-gray-400 text-black" },
  { value: -1, label: "Casi nada peor", color: "bg-orange-200 hover:bg-orange-300 text-black" },
  { value: -2, label: "Un poco peor", color: "bg-orange-400 hover:bg-orange-500 text-white" },
  { value: -3, label: "Mucho peor", color: "bg-red-600 hover:bg-red-700 text-white" },
].sort((a, b) => b.value - a.value);

const UNIDADES = ["TME", "Neuro", "Infantil", "Cardio-Respi", "Salud Mental", "Podología"];

type Step = 'WELCOME' | 'UNIT_SELECTION' | 'ASSESSMENT' | 'SUCCESS';

interface Evaluation {
  fecha: string;
  unidad: string;
  valor_groc: number;
  etiqueta_groc: string;
}

export default function App() {
  const [step, setStep] = useState<Step>('WELCOME');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [isSending, setIsSending] = useState(false);

  // URL de Google Apps Script configurada en el entorno
  const SCRIPT_URL = (import.meta.env.VITE_GOOGLE_SCRIPT_URL as string) || '';

  useEffect(() => {
    if (step === 'SUCCESS') {
      const timer = setTimeout(() => resetApp(), 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const resetApp = () => {
    setStep('WELCOME');
    setSelectedUnit('');
    setIsSending(false);
  };

  const saveToLocalStorage = (data: Evaluation) => {
    const pending = JSON.parse(localStorage.getItem('groc_pending_evals') || '[]');
    pending.push(data);
    localStorage.setItem('groc_pending_evals', JSON.stringify(pending));
  };

  const syncPending = async () => {
    if (!navigator.onLine || !SCRIPT_URL) return;
    const pending = JSON.parse(localStorage.getItem('groc_pending_evals') || '[]');
    if (pending.length === 0) return;

    for (const item of [...pending]) {
      try {
        const blob = new Blob([JSON.stringify(item)], { type: 'text/plain' });
        await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: blob
        });
        const currentPending = JSON.parse(localStorage.getItem('groc_pending_evals') || '[]');
        const updated = currentPending.filter((p: Evaluation) => p.fecha !== item.fecha);
        localStorage.setItem('groc_pending_evals', JSON.stringify(updated));
      } catch (e) {
        break;
      }
    }
  };

  const handleAssessment = async (value: number, label: string) => {
    const data: Evaluation = {
      fecha: new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
      unidad: selectedUnit,
      valor_groc: value,
      etiqueta_groc: label,
    };

    setIsSending(true);
    setStep('SUCCESS');

    try {
      if (SCRIPT_URL) {
        // Enviar como texto plano para evitar preflight CORS y asegurar compatibilidad con GAS
        await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify(data),
        });
      }
    } catch (error) {
      console.warn('Error guardando en la nube, usando almacenamiento local:', error);
      saveToLocalStorage(data);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 font-sans select-none overflow-hidden" id="app-container">
      {!SCRIPT_URL && step === 'WELCOME' && (
        <div className="fixed top-4 bg-amber-100 text-amber-800 p-3 rounded-lg text-sm font-bold shadow-sm border border-amber-200 z-50">
          ⚠️ Configuración pendiente
        </div>
      )}
      
      {/* Paso 1: Bienvenida */}
      {step === 'WELCOME' && (
        <div className="text-center animate-in fade-in zoom-in duration-300" id="step-welcome">
          <h1 className="text-9xl font-black text-blue-900 mb-8 tracking-tighter">GROC</h1>
          <p className="text-xl text-slate-400 mb-16 uppercase tracking-[0.3em] font-light">Quality Control System</p>
          <button 
            id="btn-start"
            onClick={() => setStep('UNIT_SELECTION')}
            className="group flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-4xl font-bold py-14 px-24 rounded-full shadow-2xl shadow-blue-200 transition-all active:scale-95"
          >
            Tocar para empezar
          </button>
        </div>
      )}

      {/* Paso: Selección de Unidad */}
      {step === 'UNIT_SELECTION' && (
        <div className="w-full max-w-5xl animate-in slide-in-from-bottom duration-300" id="step-unit">
          <h2 className="text-5xl font-black text-slate-800 mb-12 text-center uppercase tracking-tight">Seleccione su Unidad</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {UNIDADES.map((unidad) => (
              <button
                key={unidad}
                onClick={() => { setSelectedUnit(unidad); setStep('ASSESSMENT'); }}
                className="bg-white p-12 rounded-[2.5rem] shadow-xl hover:shadow-2xl hover:bg-blue-50 text-4xl font-black text-blue-900 border-4 border-transparent hover:border-blue-200 transition-all active:scale-95 text-center flex items-center justify-center min-h-[160px]"
              >
                {unidad}
              </button>
            ))}
          </div>
          <div className="mt-16 text-center">
            <button 
              onClick={() => setStep('WELCOME')}
              className="text-2xl font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Escala */}
      {step === 'ASSESSMENT' && (
        <div className="w-full max-w-5xl flex flex-col h-full animate-in fade-in duration-300" id="step-assessment">
          <div className="flex justify-between items-center mb-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex flex-col">
              <span className="text-xs uppercase text-slate-400 tracking-widest font-bold">Unidad Seleccionada</span>
              <span className="text-3xl font-black text-blue-900">{selectedUnit}</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-800">¿Cómo está hoy?</h2>
            <button onClick={() => setStep('UNIT_SELECTION')} className="text-blue-500 font-bold text-lg">Cambiar</button>
          </div>
          <div className="grid grid-cols-1 gap-4 flex-1">
            {GROC_SCALE.map((item) => (
              <button
                key={item.value}
                onClick={() => handleAssessment(item.value, item.label)}
                className={`flex items-center justify-between px-12 py-8 rounded-[2.5rem] shadow-lg transition-all active:scale-[0.98] ${item.color} text-white font-bold border-4 border-white`}
              >
                <span className="text-3xl uppercase tracking-wider">{item.label}</span>
                <span className="text-7xl">{item.value > 0 ? `+${item.value}` : item.value}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Paso 4: Gracias */}
      {step === 'SUCCESS' && (
        <div className="text-center animate-in zoom-in duration-300" id="step-success">
          <CheckCircle className="w-40 h-40 text-green-500 mx-auto mb-8" />
          <h2 className="text-7xl font-black text-slate-800 mb-4 tracking-tight">¡Registrado!</h2>
          <p className="text-3xl text-slate-500 mt-6 font-medium">Sus datos para <strong>{selectedUnit}</strong> han sido guardados.</p>
        </div>
      )}
    </div>
  );
}
