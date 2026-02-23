import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState, useCallback } from 'react'

export const Route = createFileRoute('/')({ component: CosmicNoiseMachine })

type LayerId = 'drone' | 'static' | 'pulsar' | 'nebula' | 'wind'

interface Layer {
  id: LayerId
  label: string
  color: string
  glyph: string
  description: string
}

const LAYERS: Layer[] = [
  { id: 'drone', label: 'Cosmic Drone', color: '#7c3aed', glyph: '◉', description: 'Deep oscillating sub-bass' },
  { id: 'static', label: 'Space Static', color: '#0891b2', glyph: '⋯', description: 'White noise filtered through void' },
  { id: 'pulsar', label: 'Pulsar Rhythm', color: '#b45309', glyph: '◆', description: 'Periodic stellar pulse' },
  { id: 'nebula', label: 'Nebula Hum', color: '#047857', glyph: '∿', description: 'Harmonic cloud resonance' },
  { id: 'wind', label: 'Solar Wind', color: '#be185d', glyph: '≋', description: 'High-frequency particle stream' },
]

interface AudioNodes {
  drone: { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode; lfo: OscillatorNode; lfoGain: GainNode }
  static: { source: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode }
  pulsar: { osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode; lfoGain: GainNode }
  nebula: { oscs: OscillatorNode[]; gain: GainNode }
  wind: { source: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode }
}

function createNoiseBuffer(ctx: AudioContext) {
  const bufferSize = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

function makeNoiseSource(ctx: AudioContext): AudioBufferSourceNode {
  const src = ctx.createBufferSource()
  src.buffer = createNoiseBuffer(ctx)
  src.loop = true
  return src
}

function CosmicNoiseMachine() {
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const nodesRef = useRef<Partial<AudioNodes>>({})
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  const [started, setStarted] = useState(false)
  const [active, setActive] = useState<Record<LayerId, boolean>>({
    drone: false, static: false, pulsar: false, nebula: false, wind: false,
  })
  const [volumes, setVolumes] = useState<Record<LayerId, number>>({
    drone: 0.6, static: 0.4, pulsar: 0.5, nebula: 0.5, wind: 0.3,
  })
  const [viz, setViz] = useState<'wave' | 'bars'>('wave')

  const initAudio = useCallback(() => {
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.connect(ctx.destination)
    ctxRef.current = ctx
    analyserRef.current = analyser

    // Drone: two detuned saws with LFO
    const droneGain = ctx.createGain(); droneGain.gain.value = 0
    const osc1 = ctx.createOscillator(); osc1.type = 'sawtooth'; osc1.frequency.value = 55
    const osc2 = ctx.createOscillator(); osc2.type = 'sawtooth'; osc2.frequency.value = 55.8
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.15
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 4
    lfo.connect(lfoGain); lfoGain.connect(osc1.detune)
    osc1.connect(droneGain); osc2.connect(droneGain); droneGain.connect(analyser)
    osc1.start(); osc2.start(); lfo.start()
    nodesRef.current.drone = { osc1, osc2, gain: droneGain, lfo, lfoGain }

    // Static: white noise + lowpass
    const staticGain = ctx.createGain(); staticGain.gain.value = 0
    const staticSrc = makeNoiseSource(ctx)
    const staticFilter = ctx.createBiquadFilter(); staticFilter.type = 'lowpass'; staticFilter.frequency.value = 800
    staticSrc.connect(staticFilter); staticFilter.connect(staticGain); staticGain.connect(analyser)
    staticSrc.start()
    nodesRef.current.static = { source: staticSrc, filter: staticFilter, gain: staticGain }

    // Pulsar: sine wave with amplitude LFO at ~0.9 Hz
    // pulsarGain is the mute gate (0 or vol) — LFO goes on an inner gain so it
    // can never bleed through when the layer is off.
    const pulsarGain = ctx.createGain(); pulsarGain.gain.value = 0
    const pulsarInner = ctx.createGain(); pulsarInner.gain.value = 0.5
    const pulsarOsc = ctx.createOscillator(); pulsarOsc.type = 'sine'; pulsarOsc.frequency.value = 220
    const pLfo = ctx.createOscillator(); pLfo.frequency.value = 0.9
    const pLfoGain = ctx.createGain(); pLfoGain.gain.value = 0.5
    pLfo.connect(pLfoGain); pLfoGain.connect(pulsarInner.gain)
    pulsarOsc.connect(pulsarInner); pulsarInner.connect(pulsarGain); pulsarGain.connect(analyser)
    pulsarOsc.start(); pLfo.start()
    nodesRef.current.pulsar = { osc: pulsarOsc, gain: pulsarGain, lfo: pLfo, lfoGain: pLfoGain }

    // Nebula: chord of 5 sine waves
    const nebulaGain = ctx.createGain(); nebulaGain.gain.value = 0
    const freqs = [130.81, 164.81, 196, 246.94, 293.66]
    const nebOscs = freqs.map(f => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f
      const g = ctx.createGain(); g.gain.value = 0.2
      o.connect(g); g.connect(nebulaGain)
      o.start(); return o
    })
    nebulaGain.connect(analyser)
    nodesRef.current.nebula = { oscs: nebOscs, gain: nebulaGain }

    // Wind: noise + highpass
    const windGain = ctx.createGain(); windGain.gain.value = 0
    const windSrc = makeNoiseSource(ctx)
    const windFilter = ctx.createBiquadFilter(); windFilter.type = 'highpass'; windFilter.frequency.value = 3000
    windSrc.connect(windFilter); windFilter.connect(windGain); windGain.connect(analyser)
    windSrc.start()
    nodesRef.current.wind = { source: windSrc, filter: windFilter, gain: windGain }
  }, [])

  const toggleLayer = useCallback((id: LayerId) => {
    if (!ctxRef.current) return
    const next = !active[id]
    setActive(prev => ({ ...prev, [id]: next }))
    const nodes = nodesRef.current[id]
    if (!nodes) return
    const gain = (nodes as { gain: GainNode }).gain
    const vol = volumes[id]
    gain.gain.cancelScheduledValues(ctxRef.current.currentTime)
    gain.gain.setTargetAtTime(next ? vol : 0, ctxRef.current.currentTime, 0.3)
  }, [active, volumes])

  const setVolume = useCallback((id: LayerId, val: number) => {
    setVolumes(prev => ({ ...prev, [id]: val }))
    if (!ctxRef.current || !active[id]) return
    const nodes = nodesRef.current[id]
    if (!nodes) return
    const gain = (nodes as { gain: GainNode }).gain
    gain.gain.setTargetAtTime(val, ctxRef.current.currentTime, 0.05)
  }, [active])

  const handleStart = useCallback(() => {
    initAudio()
    setStarted(true)
  }, [initAudio])

  // Canvas visualizer
  useEffect(() => {
    if (!started) return
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return
    const ctx2d = canvas.getContext('2d')!
    const bufLen = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufLen)

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      const W = canvas.width, H = canvas.height
      ctx2d.fillStyle = 'rgba(3,7,18,0.25)'
      ctx2d.fillRect(0, 0, W, H)

      if (viz === 'wave') {
        analyser.getByteTimeDomainData(dataArray)
        ctx2d.beginPath()
        ctx2d.strokeStyle = '#7c3aed'
        ctx2d.lineWidth = 2
        ctx2d.shadowBlur = 12
        ctx2d.shadowColor = '#7c3aed'
        const slice = W / bufLen
        let x = 0
        for (let i = 0; i < bufLen; i++) {
          const v = dataArray[i] / 128
          const y = (v * H) / 2
          i === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y)
          x += slice
        }
        ctx2d.stroke()
        ctx2d.shadowBlur = 0
      } else {
        analyser.getByteFrequencyData(dataArray)
        const barW = (W / bufLen) * 2.5
        let bx = 0
        for (let i = 0; i < bufLen; i++) {
          const barH = (dataArray[i] / 255) * H
          const hue = (i / bufLen) * 280 + 200
          ctx2d.fillStyle = `hsl(${hue},80%,60%)`
          ctx2d.shadowBlur = 6
          ctx2d.shadowColor = `hsl(${hue},80%,60%)`
          ctx2d.fillRect(bx, H - barH, barW, barH)
          bx += barW + 1
        }
        ctx2d.shadowBlur = 0
      }
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [started, viz])

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      const ctx2d = canvas.getContext('2d')!
      ctx2d.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const anyActive = Object.values(active).some(Boolean)

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-start px-4 py-10 gap-8 font-mono">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tight">
          <span className="text-violet-400">✦</span>{' '}
          <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            COSMIC NOISE
          </span>{' '}
          <span className="text-violet-400">✦</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">ambient soundscapes from the edge of space</p>
      </div>

      {/* Canvas */}
      <div className="w-full max-w-2xl h-36 rounded-xl overflow-hidden border border-gray-800 bg-[#020408] relative">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%' }}
        />
        {!started && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-gray-600 text-xs tracking-widest uppercase">awaiting signal</span>
          </div>
        )}
        {started && (
          <button
            onClick={() => setViz(v => v === 'wave' ? 'bars' : 'wave')}
            className="absolute top-2 right-2 text-xs text-gray-600 hover:text-gray-400 transition-colors px-2 py-1 rounded border border-gray-800 hover:border-gray-600"
          >
            {viz === 'wave' ? 'bars' : 'wave'}
          </button>
        )}
      </div>

      {/* Launch */}
      {!started && (
        <button
          onClick={handleStart}
          className="px-8 py-3 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold tracking-wide transition-all shadow-lg shadow-violet-900/50 hover:shadow-violet-700/50 hover:scale-105 active:scale-95"
        >
          INITIALIZE
        </button>
      )}

      {/* Layers */}
      {started && (
        <div className="w-full max-w-2xl flex flex-col gap-3">
          {LAYERS.map(layer => {
            const isOn = active[layer.id]
            return (
              <div
                key={layer.id}
                className={`rounded-xl border p-4 transition-all duration-300 ${
                  isOn
                    ? 'border-opacity-60 bg-white/5'
                    : 'border-gray-800 bg-white/[0.02]'
                }`}
                style={isOn ? { borderColor: layer.color + '99' } : {}}
              >
                <div className="flex items-center gap-4">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleLayer(layer.id)}
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg transition-all duration-200 shrink-0"
                    style={isOn
                      ? { borderColor: layer.color, color: layer.color, boxShadow: `0 0 12px ${layer.color}66` }
                      : { borderColor: '#374151', color: '#6b7280' }
                    }
                  >
                    {layer.glyph}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-sm" style={isOn ? { color: layer.color } : { color: '#9ca3af' }}>
                        {layer.label}
                      </span>
                      <span className="text-gray-600 text-xs truncate">{layer.description}</span>
                    </div>
                    {/* Volume slider */}
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volumes[layer.id]}
                      onChange={e => setVolume(layer.id, parseFloat(e.target.value))}
                      className="w-full mt-2 h-1 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, ${isOn ? layer.color : '#374151'} ${volumes[layer.id] * 100}%, #1f2937 ${volumes[layer.id] * 100}%)`,
                        accentColor: layer.color,
                      }}
                    />
                  </div>

                  {/* Level indicator */}
                  <div className="flex gap-[3px] shrink-0">
                    {Array.from({ length: 8 }, (_, i) => (
                      <div
                        key={i}
                        className="w-[3px] rounded-full transition-all duration-100"
                        style={{
                          height: `${10 + i * 4}px`,
                          background: isOn && (i / 8) < volumes[layer.id]
                            ? layer.color
                            : '#1f2937',
                          boxShadow: isOn && (i / 8) < volumes[layer.id]
                            ? `0 0 4px ${layer.color}`
                            : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Status */}
      {started && (
        <p className="text-gray-700 text-xs tracking-widest">
          {anyActive ? '⬤ TRANSMITTING' : '○ SILENCE'}
        </p>
      )}
    </div>
  )
}
