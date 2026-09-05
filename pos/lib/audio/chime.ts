// Dos tonos cortos cuando entra una comanda. Sin archivo de audio: Web Audio en línea.
// El navegador exige un gesto previo para sonar; si no lo hubo, calla sin romper nada.
export function chime(): void {
  try {
    const ctx = new window.AudioContext()
    ;[880, 1320].forEach((freq, i) => {
      const at = ctx.currentTime + i * 0.18
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.2, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16)
      osc.start(at)
      osc.stop(at + 0.18)
    })
  } catch {
    // sin audio disponible: el KDS sigue funcionando en silencio
  }
}
