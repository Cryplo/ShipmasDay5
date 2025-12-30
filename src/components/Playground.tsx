'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

// Types
interface Player {
  x: number
  y: number
  velocityX: number
  velocityY: number
  width: number
  height: number
  speed: number
  isGrounded: boolean
  facingRight: boolean
  interaction: 'none' | 'swing' | 'merrygoround' | 'slide'
  interactionProgress: number
}

interface Swing {
  x: number
  y: number
  width: number
  height: number
  angle: number
  angularVelocity: number
  seatY: number
}

interface MerryGoRound {
  x: number
  y: number
  radius: number
  angle: number
  angularVelocity: number
}

interface Slide {
  x: number
  y: number
  width: number
  height: number
  ladderHeight: number
}



interface DustParticle {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  drift: number
}

interface GameState {
  player: Player
  swing: Swing
  merryGoRound: MerryGoRound
  slide: Slide
  keys: Set<string>
  time: number
  fadeOpacity: number
  started: boolean
  audioContext: AudioContext | null
  dustParticles: DustParticle[]
}

// Color palette - muted golden hour
const COLORS = {
  sky: '#e8c9a0',
  skyGradientTop: '#c9a882',
  ground: '#8b7355',
  groundShadow: '#6b5a45',
  grass: '#7a8b5a',
  grassHighlight: '#9aa87a',
  metal: '#7a6b5a',
  metalHighlight: '#9a8b7a',
  metalDark: '#5a4b3a',
  wood: '#8b6b4a',
  woodDark: '#6b4b2a',
  player: '#5a4a3a',
  playerHighlight: '#7a6a5a',
  shadow: 'rgba(45, 38, 30, 0.3)',
  sunGlow: 'rgba(255, 200, 120, 0.15)',
}

export default function Playground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameStateRef = useRef<GameState | null>(null)
  const animationRef = useRef<number>(0)
  const [hasStarted, setHasStarted] = useState(false)
  const [fadeIn, setFadeIn] = useState(1)

  // Initialize game state
  const initGameState = useCallback((): GameState => {
    const w = window.innerWidth
    const h = window.innerHeight
    const groundY = h * 0.7

    return {
      player: {
        x: w * 0.35,
        y: groundY - 40,
        velocityX: 0,
        velocityY: 0,
        width: 20,
        height: 35,
        speed: 4,
        isGrounded: true,
        facingRight: true,
        interaction: 'none',
        interactionProgress: 0,
      },
      swing: {
        x: w * 0.2,
        y: groundY - 200,
        width: 80,
        height: 180,
        angle: 0,
        angularVelocity: 0,
        seatY: groundY - 60,
      },
      merryGoRound: {
        x: w * 0.5,
        y: groundY - 30,
        radius: 60,
        angle: 0,
        angularVelocity: 0,
      },
      slide: {
        x: w * 0.72 + 125, // Moved right by 5 grass gaps (25px each)
        y: groundY - 220,
        width: 100,
        height: 200,
        ladderHeight: 150,
      },
      keys: new Set(),
      time: 0,
      fadeOpacity: 0,
      started: false,
      audioContext: null,
      dustParticles: Array.from({ length: 30 }, () => ({
        x: Math.random() * w,
        y: Math.random() * (h * 0.6),
        size: 1 + Math.random() * 2,
        speed: 0.2 + Math.random() * 0.3,
        opacity: 0.1 + Math.random() * 0.2,
        drift: Math.random() * Math.PI * 2,
      })),
    }
  }, [])

  // Ambient audio generation
  const createAmbientAudio = useCallback((ctx: AudioContext) => {
    // Wind sound - filtered white noise
    const windGain = ctx.createGain()
    windGain.gain.value = 0.03
    windGain.connect(ctx.destination)

    const windFilter = ctx.createBiquadFilter()
    windFilter.type = 'lowpass'
    windFilter.frequency.value = 400
    windFilter.connect(windGain)

    const bufferSize = 2 * ctx.sampleRate
    const windBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const windData = windBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      windData[i] = (Math.random() * 2 - 1) * 0.5
    }

    const windSource = ctx.createBufferSource()
    windSource.buffer = windBuffer
    windSource.loop = true
    windSource.connect(windFilter)
    windSource.start()

    // Gentle modulation for wind
    const modulate = () => {
      const now = ctx.currentTime
      windGain.gain.setValueAtTime(0.02 + Math.random() * 0.02, now)
      windFilter.frequency.setValueAtTime(300 + Math.random() * 200, now)
      setTimeout(modulate, 2000 + Math.random() * 3000)
    }
    modulate()

    // Occasional bird chirp
    const chirp = () => {
      const osc = ctx.createOscillator()
      const chirpGain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = 2000 + Math.random() * 1000

      chirpGain.gain.value = 0
      chirpGain.gain.setValueAtTime(0, ctx.currentTime)
      chirpGain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.05)
      chirpGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15)

      osc.connect(chirpGain)
      chirpGain.connect(ctx.destination)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.2)

      setTimeout(chirp, 5000 + Math.random() * 10000)
    }
    setTimeout(chirp, 3000)

    return windSource
  }, [])

  // Metal creak sound
  const playCreak = useCallback((ctx: AudioContext, intensity: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = 'sawtooth'
    osc.frequency.value = 80 + Math.random() * 40

    filter.type = 'bandpass'
    filter.frequency.value = 200
    filter.Q.value = 10

    gain.gain.value = 0
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.01 * intensity, ctx.currentTime + 0.02)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
  }, [])

  // Draw functions
  const drawSky = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height * 0.7)
    gradient.addColorStop(0, COLORS.skyGradientTop)
    gradient.addColorStop(1, COLORS.sky)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height * 0.7)

    // Sun glow (low on horizon, right side)
    const sunX = width * 0.85
    const sunY = height * 0.45
    const sunGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 150)
    sunGradient.addColorStop(0, 'rgba(255, 220, 160, 0.4)')
    sunGradient.addColorStop(0.5, 'rgba(255, 200, 120, 0.15)')
    sunGradient.addColorStop(1, 'rgba(255, 180, 100, 0)')
    ctx.fillStyle = sunGradient
    ctx.fillRect(0, 0, width, height)
  }, [])

  const drawDustParticles = useCallback((ctx: CanvasRenderingContext2D, particles: DustParticle[], time: number, width: number) => {
    particles.forEach((p, i) => {
      // Update particle position
      p.x += p.speed + Math.sin(time * 0.5 + p.drift) * 0.3
      p.y += Math.sin(time * 0.3 + i) * 0.1

      // Wrap around
      if (p.x > width + 10) {
        p.x = -10
        p.y = Math.random() * 400
      }

      // Draw with subtle glow in sunlight area
      const distFromSun = Math.sqrt(Math.pow(p.x - width * 0.85, 2) + Math.pow(p.y - 300, 2))
      const inSunbeam = distFromSun < 200
      const opacity = inSunbeam ? p.opacity * 1.5 : p.opacity

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 230, 180, ${opacity})`
      ctx.fill()
    })
  }, [])

  const drawGround = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Main ground
    const groundY = height * 0.7
    const gradient = ctx.createLinearGradient(0, groundY, 0, height)
    gradient.addColorStop(0, COLORS.ground)
    gradient.addColorStop(1, COLORS.groundShadow)
    ctx.fillStyle = gradient
    ctx.fillRect(0, groundY, width, height * 0.3)

    // Grass tufts - spread evenly across entire width
    ctx.strokeStyle = COLORS.grass
    ctx.lineWidth = 2
    const grassSpacing = 25
    const numGrassTufts = Math.ceil(width / grassSpacing) + 1
    for (let i = 0; i < numGrassTufts; i++) {
      const x = i * grassSpacing + 10
      const baseY = groundY + 5
      ctx.beginPath()
      ctx.moveTo(x, baseY)
      ctx.quadraticCurveTo(x - 3, baseY - 8, x - 2, baseY - 12)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x, baseY)
      ctx.quadraticCurveTo(x + 2, baseY - 6, x + 3, baseY - 10)
      ctx.stroke()
    }
  }, [])

  const drawSwing = useCallback((ctx: CanvasRenderingContext2D, swing: Swing, playerOn: boolean, angle: number) => {
    const { x, y, width } = swing
    
    // Ground level for legs to touch
    const groundY = window.innerHeight * 0.7

    // Shadow on ground
    ctx.fillStyle = COLORS.shadow
    ctx.beginPath()
    ctx.ellipse(x, groundY + 5, 40, 10, 0, 0, Math.PI * 2)
    ctx.fill()

    // Frame (A-frame)
    ctx.strokeStyle = COLORS.metal
    ctx.lineWidth = 6
    ctx.lineCap = 'round'

    // Left leg - extends to ground
    ctx.beginPath()
    ctx.moveTo(x - width / 2, groundY)
    ctx.lineTo(x - 15, y)
    ctx.stroke()

    // Right leg - extends to ground
    ctx.beginPath()
    ctx.moveTo(x + width / 2, groundY)
    ctx.lineTo(x + 15, y)
    ctx.stroke()

    // Top bar
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(x - 20, y)
    ctx.lineTo(x + 20, y)
    ctx.stroke()

    // Swing ropes and seat
    const ropeLength = 120
    const seatX = x + Math.sin(angle) * ropeLength * 0.7
    const seatY = y + Math.cos(angle) * ropeLength

    ctx.strokeStyle = COLORS.metalDark
    ctx.lineWidth = 2

    // Left rope
    ctx.beginPath()
    ctx.moveTo(x - 10, y + 5)
    ctx.lineTo(seatX - 15, seatY)
    ctx.stroke()

    // Right rope
    ctx.beginPath()
    ctx.moveTo(x + 10, y + 5)
    ctx.lineTo(seatX + 15, seatY)
    ctx.stroke()

    // Seat
    ctx.fillStyle = COLORS.wood
    ctx.fillRect(seatX - 20, seatY, 40, 8)
    ctx.fillStyle = COLORS.woodDark
    ctx.fillRect(seatX - 20, seatY + 6, 40, 2)

    return { seatX, seatY }
  }, [])

  const drawMerryGoRound = useCallback((ctx: CanvasRenderingContext2D, mgr: MerryGoRound, playerOn: boolean) => {
    const { x, y, radius, angle } = mgr

    // Shadow
    ctx.fillStyle = COLORS.shadow
    ctx.beginPath()
    ctx.ellipse(x, y + 20, radius + 10, 15, 0, 0, Math.PI * 2)
    ctx.fill()

    // Base pole
    ctx.fillStyle = COLORS.metal
    ctx.beginPath()
    ctx.moveTo(x - 8, y)
    ctx.lineTo(x + 8, y)
    ctx.lineTo(x + 5, y - 60)
    ctx.lineTo(x - 5, y - 60)
    ctx.closePath()
    ctx.fill()

    // Platform (ellipse for perspective)
    ctx.save()
    ctx.translate(x, y)

    // Bottom edge
    ctx.fillStyle = COLORS.metalDark
    ctx.beginPath()
    ctx.ellipse(0, 5, radius, radius * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()

    // Top surface
    ctx.fillStyle = COLORS.metal
    ctx.beginPath()
    ctx.ellipse(0, 0, radius, radius * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()

    // Bars (rotating)
    ctx.strokeStyle = COLORS.metalHighlight
    ctx.lineWidth = 3
    for (let i = 0; i < 4; i++) {
      const barAngle = angle + (i * Math.PI / 2)
      const endX = Math.cos(barAngle) * (radius - 5)
      const endY = Math.sin(barAngle) * (radius - 5) * 0.3

      ctx.beginPath()
      ctx.moveTo(0, -60)
      ctx.lineTo(endX, endY)
      ctx.stroke()

      // Handle at end
      ctx.beginPath()
      ctx.arc(endX, endY - 15, 3, 0, Math.PI * 2)
      ctx.fillStyle = COLORS.metalHighlight
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(endX, endY)
      ctx.lineTo(endX, endY - 20)
      ctx.stroke()
    }

    ctx.restore()
  }, [])

  const drawSlide = useCallback((ctx: CanvasRenderingContext2D, slide: Slide) => {
    const { x, y, width, height, ladderHeight } = slide

    // Shadow
    ctx.fillStyle = COLORS.shadow
    ctx.beginPath()
    ctx.ellipse(x + width / 2, y + height + 30, 50, 12, 0, 0, Math.PI * 2)
    ctx.fill()

    // Platform at top
    ctx.fillStyle = COLORS.metal
    ctx.fillRect(x - 10, y, 40, 20)

    // Ladder supports - extend to ground level (y + height + 20 is ground)
    const groundLevel = y + height + 20
    ctx.strokeStyle = COLORS.metal
    ctx.lineWidth = 4
    // Left pole
    ctx.beginPath()
    ctx.moveTo(x - 20, groundLevel)
    ctx.lineTo(x - 5, y + 20)
    ctx.stroke()
    // Right pole
    ctx.beginPath()
    ctx.moveTo(x + 15, groundLevel)
    ctx.lineTo(x + 25, y + 20)
    ctx.stroke()

    // Ladder rungs - offset should decrease as we go up (perspective)
    ctx.lineWidth = 3
    for (let i = 0; i < 5; i++) {
      const rungY = y + 40 + i * 30
      // Calculate x positions by interpolating along the poles
      const t = (rungY - (y + 20)) / (groundLevel - (y + 20))
      const leftX = x - 5 + t * (-20 - (-5))
      const rightX = x + 25 + t * (15 - 25)
      ctx.beginPath()
      ctx.moveTo(leftX + 3, rungY)
      ctx.lineTo(rightX - 3, rungY)
      ctx.stroke()
    }

    // Slide surface
    ctx.fillStyle = COLORS.metalHighlight
    ctx.beginPath()
    ctx.moveTo(x + 25, y + 15)
    ctx.quadraticCurveTo(x + width - 20, y + height / 2, x + width, y + height + 20)
    ctx.lineTo(x + width + 25, y + height + 20)
    ctx.quadraticCurveTo(x + width + 5, y + height / 2, x + 55, y + 15)
    ctx.closePath()
    ctx.fill()

    // Slide edges
    ctx.strokeStyle = COLORS.metal
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x + 25, y + 15)
    ctx.quadraticCurveTo(x + width - 20, y + height / 2, x + width, y + height + 20)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + 55, y + 15)
    ctx.quadraticCurveTo(x + width + 5, y + height / 2, x + width + 25, y + height + 20)
    ctx.stroke()
  }, [])



  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D, player: Player, time: number, swingSeatPos?: { x: number, y: number }) => {
    let { x, y } = player
    const { width, height, interaction, interactionProgress, velocityX, velocityY, isGrounded, facingRight } = player

    // Adjust position based on interaction
    if (interaction === 'swing' && swingSeatPos) {
      x = swingSeatPos.x
      y = swingSeatPos.y - height + 5
    }

    // Determine if running and sliding states
    const isRunning = Math.abs(velocityX) > 0.5 && isGrounded
    const isJumping = !isGrounded
    const isSliding = interaction === 'slide' && interactionProgress >= 0.5
    const isClimbing = interaction === 'slide' && interactionProgress < 0.5
    const isOnMerryGoRound = interaction === 'merrygoround'

    // Shadow (only when not on equipment)
    if (interaction === 'none') {
      // Shadow size varies with height (smaller when jumping high)
      const shadowScale = isJumping ? 0.5 : 1
      ctx.fillStyle = COLORS.shadow
      ctx.beginPath()
      ctx.ellipse(x, (window.innerHeight * 0.7) - 5, width * 0.8 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // Apply facing direction and lean when moving
    ctx.save()
    ctx.translate(x, y + height * 0.5) // Rotate around center of body
    
    // Add lean when moving left/right (but flip direction when sliding)
    if (interaction === 'none' && Math.abs(velocityX) > 0.5) {
      const leanAngle = velocityX * 0.03 // Lean in direction of movement
      ctx.rotate(leanAngle)
    } else if (isSliding) {
      // Lean back while sliding down (negative angle to lean backward)
      ctx.rotate(-0.15)
    }
    
    if (!facingRight) {
      ctx.scale(-1, 1)
    }
    ctx.translate(-x, -(y + height * 0.5))

    // Body - simple abstract figure
    ctx.fillStyle = COLORS.player

    // Torso
    ctx.beginPath()
    ctx.ellipse(x, y + height * 0.5, width * 0.4, height * 0.35, 0, 0, Math.PI * 2)
    ctx.fill()

    // Head
    ctx.beginPath()
    ctx.arc(x, y + height * 0.15, width * 0.4, 0, Math.PI * 2)
    ctx.fill()

    // Legs (adjust based on state)
    ctx.strokeStyle = COLORS.player
    ctx.lineWidth = 4
    ctx.lineCap = 'round'

    if (interaction === 'swing') {
      // Legs forward when swinging
      const legAngle = Math.sin(time * 2) * 0.3
      ctx.beginPath()
      ctx.moveTo(x - 5, y + height * 0.7)
      ctx.lineTo(x - 5 + Math.sin(legAngle) * 15, y + height + Math.cos(legAngle) * 5)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + 5, y + height * 0.7)
      ctx.lineTo(x + 5 + Math.sin(legAngle) * 15, y + height + Math.cos(legAngle) * 5)
      ctx.stroke()
    } else if (isOnMerryGoRound || isClimbing || isSliding) {
      // Static standing legs for merry-go-round, climbing, and sliding
      ctx.beginPath()
      ctx.moveTo(x - 5, y + height * 0.7)
      ctx.lineTo(x - 7, y + height)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + 5, y + height * 0.7)
      ctx.lineTo(x + 7, y + height)
      ctx.stroke()
    } else if (isJumping) {
      // Jumping pose - legs tucked or extended based on velocity
      const legOffset = velocityY < 0 ? -5 : 5 // Tucked when going up, extended when falling
      ctx.beginPath()
      ctx.moveTo(x - 5, y + height * 0.7)
      ctx.lineTo(x - 10, y + height + legOffset)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + 5, y + height * 0.7)
      ctx.lineTo(x + 10, y + height + legOffset)
      ctx.stroke()
    } else if (isRunning) {
      // Running animation
      const runCycle = Math.sin(time * 15) * 0.5
      ctx.beginPath()
      ctx.moveTo(x - 5, y + height * 0.7)
      ctx.lineTo(x - 5 + runCycle * 10, y + height)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + 5, y + height * 0.7)
      ctx.lineTo(x + 5 - runCycle * 10, y + height)
      ctx.stroke()
    } else {
      // Standing legs
      ctx.beginPath()
      ctx.moveTo(x - 5, y + height * 0.7)
      ctx.lineTo(x - 7, y + height)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + 5, y + height * 0.7)
      ctx.lineTo(x + 7, y + height)
      ctx.stroke()
    }

    // Arms
    ctx.lineWidth = 3
    if (interaction === 'swing') {
      // Arms up holding ropes
      ctx.beginPath()
      ctx.moveTo(x - 8, y + height * 0.4)
      ctx.lineTo(x - 12, y + height * 0.2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + 8, y + height * 0.4)
      ctx.lineTo(x + 12, y + height * 0.2)
      ctx.stroke()
    } else if (isOnMerryGoRound) {
      // Hide arms - player is holding on but arms are obscured by body
      // Don't draw any arms
    } else if (isClimbing) {
      // Climbing animation - arms reaching up alternately
      const climbCycle = Math.sin(time * 8)
      ctx.beginPath()
      ctx.moveTo(x - 8, y + height * 0.4)
      ctx.lineTo(x - 10, y + height * (0.2 + climbCycle * 0.1))
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + 8, y + height * 0.4)
      ctx.lineTo(x + 10, y + height * (0.2 - climbCycle * 0.1))
      ctx.stroke()
    } else if (isSliding) {
      // Arms up/back while sliding - static pose
      ctx.beginPath()
      ctx.moveTo(x - 8, y + height * 0.4)
      ctx.lineTo(x - 15, y + height * 0.3)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + 8, y + height * 0.4)
      ctx.lineTo(x + 15, y + height * 0.3)
      ctx.stroke()
    } else if (isRunning) {
      // Running arm swing
      const armSwing = Math.sin(time * 15) * 0.4
      ctx.beginPath()
      ctx.moveTo(x - 8, y + height * 0.4)
      ctx.lineTo(x - 12 + armSwing * 8, y + height * 0.55)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + 8, y + height * 0.4)
      ctx.lineTo(x + 12 - armSwing * 8, y + height * 0.55)
      ctx.stroke()
    } else if (isJumping) {
      // Arms up when jumping
      ctx.beginPath()
      ctx.moveTo(x - 8, y + height * 0.4)
      ctx.lineTo(x - 15, y + height * 0.25)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + 8, y + height * 0.4)
      ctx.lineTo(x + 15, y + height * 0.25)
      ctx.stroke()
    } else {
      // Arms at sides
      ctx.beginPath()
      ctx.moveTo(x - 8, y + height * 0.4)
      ctx.lineTo(x - 12, y + height * 0.65)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + 8, y + height * 0.4)
      ctx.lineTo(x + 12, y + height * 0.65)
      ctx.stroke()
    }

    ctx.restore()
  }, [])

  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    const state = gameStateRef.current
    if (!canvas || !state) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Update time
    state.time += 0.016

    // Physics constants
    const gravity = 0.5
    const jumpForce = -12
    const groundY = height * 0.7 - state.player.height

    // Player movement (only when not interacting)
    if (state.player.interaction === 'none') {
      // Horizontal movement
      if (state.keys.has('ArrowLeft') || state.keys.has('KeyA')) {
        state.player.velocityX = -state.player.speed
        state.player.facingRight = false
      } else if (state.keys.has('ArrowRight') || state.keys.has('KeyD')) {
        state.player.velocityX = state.player.speed
        state.player.facingRight = true
      } else {
        // Apply friction when no input
        state.player.velocityX *= 0.8
        if (Math.abs(state.player.velocityX) < 0.1) state.player.velocityX = 0
      }

      // Jumping - use W, ArrowUp, or Space when grounded
      if ((state.keys.has('KeyW') || state.keys.has('ArrowUp') || state.keys.has('Space')) && state.player.isGrounded) {
        state.player.velocityY = jumpForce
        state.player.isGrounded = false
      }

      // Apply gravity
      state.player.velocityY += gravity

      // Update position
      state.player.x += state.player.velocityX
      state.player.y += state.player.velocityY

      // Ground collision
      if (state.player.y >= groundY) {
        state.player.y = groundY
        state.player.velocityY = 0
        state.player.isGrounded = true
      }

      // Horizontal bounds
      state.player.x = Math.max(50, Math.min(width - 50, state.player.x))

      // Check for interaction zones (Enter key only, Space is for jump)
      const { swing, merryGoRound, slide } = state

      // Swing interaction
      if (Math.abs(state.player.x - swing.x) < 30 &&
          Math.abs(state.player.y - (swing.y + swing.height - 30)) < 30 &&
          state.keys.has('Enter')) {
        state.player.interaction = 'swing'
        state.swing.angularVelocity = 0.02
      }

      // Merry-go-round interaction
      if (Math.abs(state.player.x - merryGoRound.x) < merryGoRound.radius + 20 &&
          Math.abs(state.player.y - merryGoRound.y) < 30 &&
          state.keys.has('Enter')) {
        state.player.interaction = 'merrygoround'
        state.merryGoRound.angularVelocity = 0.02
      }

      // Slide interaction
      if (Math.abs(state.player.x - (slide.x - 10)) < 30 &&
          Math.abs(state.player.y - (slide.y + slide.ladderHeight + 40)) < 30 &&
          state.keys.has('Enter')) {
        state.player.interaction = 'slide'
        state.player.interactionProgress = 0
      }

    }

    // Update swing physics (always runs, even when player is off)
    const swingGravity = 0.0008
    state.swing.angularVelocity -= Math.sin(state.swing.angle) * swingGravity
    state.swing.angularVelocity *= 0.998 // Damping
    state.swing.angle += state.swing.angularVelocity

    if (state.player.interaction === 'swing') {
      // Player can pump the swing
      if (state.keys.has('ArrowUp') || state.keys.has('KeyW')) {
        if (Math.abs(state.swing.angle) < 0.3) {
          state.swing.angularVelocity += 0.001 * Math.sign(state.swing.angularVelocity || 0.001)
        }
      }

      // Play creak sound at swing extremes
      if (state.audioContext && Math.abs(state.swing.angularVelocity) > 0.01) {
        if (Math.abs(state.swing.angle) > 0.4 && Math.random() < 0.02) {
          playCreak(state.audioContext, Math.abs(state.swing.angularVelocity) * 20)
        }
      }

      // Exit swing
      if (state.keys.has('Escape') ||
          (state.keys.has('Enter') &&
           Math.abs(state.swing.angle) < 0.1 && Math.abs(state.swing.angularVelocity) < 0.01)) {
        state.player.interaction = 'none'
        state.player.y = state.swing.y + state.swing.height - 30
        state.player.velocityX = 0
        state.player.velocityY = 0
        state.player.isGrounded = false
      }
    }

    // Update merry-go-round physics
    if (state.player.interaction === 'merrygoround') {
      state.merryGoRound.angle += state.merryGoRound.angularVelocity
      state.merryGoRound.angularVelocity *= 0.995 // Friction

      // Player can spin it
      if (state.keys.has('ArrowLeft') || state.keys.has('KeyA')) {
        state.merryGoRound.angularVelocity += 0.002
      }
      if (state.keys.has('ArrowRight') || state.keys.has('KeyD')) {
        state.merryGoRound.angularVelocity -= 0.002
      }

      // Limit speed
      state.merryGoRound.angularVelocity = Math.max(-0.1, Math.min(0.1, state.merryGoRound.angularVelocity))

      // Update player position on merry-go-round
      // X position uses cos for left/right movement - increased multiplier for more horizontal travel
      state.player.x = state.merryGoRound.x + Math.cos(state.merryGoRound.angle) * (state.merryGoRound.radius + 5)
      // Y position uses sin to create perspective - player moves "up" (smaller Y) when on far side
      // Increased vertical range and raised base position
      state.player.y = state.merryGoRound.y - 35 + Math.sin(state.merryGoRound.angle) * (state.merryGoRound.radius - 15) * 0.4

      // Exit
      if (state.keys.has('Escape') ||
          (state.keys.has('Enter') &&
           Math.abs(state.merryGoRound.angularVelocity) < 0.01)) {
        state.player.interaction = 'none'
        state.player.x = state.merryGoRound.x + state.merryGoRound.radius + 30
        state.player.velocityX = 0
        state.player.velocityY = 0
        state.player.isGrounded = false
      }
    } else {
      // Slow down merry-go-round when player not on it
      state.merryGoRound.angularVelocity *= 0.99
      state.merryGoRound.angle += state.merryGoRound.angularVelocity
    }

    // Update slide interaction
    if (state.player.interaction === 'slide') {
      const { slide } = state
      
      // Different speeds for climbing (slow) vs sliding (fast)
      // Climbing phase is 0 to 0.5, sliding phase is 0.5 to 1
      if (state.player.interactionProgress < 0.5) {
        state.player.interactionProgress += 0.004 // Slower climbing
      } else {
        state.player.interactionProgress += 0.012 // Sliding (slightly slower)
      }

      if (state.player.interactionProgress < 0.5) {
        // Climbing ladder
        const climbProgress = state.player.interactionProgress / 0.5
        state.player.x = slide.x - 10
        state.player.y = slide.y + slide.ladderHeight + 40 - (climbProgress * (slide.ladderHeight + 20))
      } else if (state.player.interactionProgress < 1) {
        // Sliding down
        const slideProgress = (state.player.interactionProgress - 0.5) / 0.5
        const curveX = slide.x + 40 + slideProgress * (slide.width - 20)
        const curveY = slide.y + 20 + slideProgress * slide.height
        state.player.x = curveX
        state.player.y = curveY - 20
      } else {
        // Done sliding
        state.player.interaction = 'none'
        state.player.x = slide.x + slide.width + 20
        state.player.y = slide.y + slide.height + 30
        state.player.velocityX = 0
        state.player.velocityY = 0
        state.player.isGrounded = false
      }
    }

    // Draw scene
    ctx.clearRect(0, 0, width, height)

    drawSky(ctx, width, height, state.time)

    // Draw dust particles in the air (before ground, adds depth)
    drawDustParticles(ctx, state.dustParticles, state.time, width)

    drawGround(ctx, width, height)

    // Draw equipment (with depth sorting)
    drawSlide(ctx, state.slide)
    drawMerryGoRound(ctx, state.merryGoRound, state.player.interaction === 'merrygoround')

    const swingSeatPos = drawSwing(ctx, state.swing, state.player.interaction === 'swing', state.swing.angle)

    // Draw player
    drawPlayer(ctx, state.player, state.time,
      state.player.interaction === 'swing' ? { x: swingSeatPos.seatX, y: swingSeatPos.seatY } : undefined)

    // Draw controls help centered (horizontally and vertically in top area)
    ctx.save()
    ctx.font = '14px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const controlsText = 'A/D - Move    W/Space - Jump    Enter - Interact    Esc - Exit'
    const controlsY = height * 0.35 // Center vertically in the sky area (above ground at 0.7)
    // Shadow for better readability
    ctx.fillStyle = 'rgba(45, 38, 30, 0.5)'
    ctx.fillText(controlsText, width / 2 + 1, controlsY + 1)
    // Main text
    ctx.fillStyle = COLORS.metalHighlight
    ctx.fillText(controlsText, width / 2, controlsY)
    ctx.restore()

    animationRef.current = requestAnimationFrame(gameLoop)
  }, [drawSky, drawGround, drawSwing, drawMerryGoRound, drawSlide, drawPlayer, playCreak, drawDustParticles])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current) {
        gameStateRef.current.keys.add(e.code)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameStateRef.current) {
        gameStateRef.current.keys.delete(e.code)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Initialize and start game
  const startExperience = useCallback(() => {
    setHasStarted(true)

    // Fade in
    const fadeInterval = setInterval(() => {
      setFadeIn(prev => {
        if (prev <= 0) {
          clearInterval(fadeInterval)
          return 0
        }
        return prev - 0.02
      })
    }, 30)

    // Initialize audio
    const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

    gameStateRef.current = initGameState()
    gameStateRef.current.audioContext = audioContext
    gameStateRef.current.started = true

    createAmbientAudio(audioContext)

    animationRef.current = requestAnimationFrame(gameLoop)
  }, [initGameState, createAmbientAudio, gameLoop])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <div className="w-full h-full overflow-hidden" style={{ backgroundColor: '#2d261e' }}>
      {!hasStarted && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
          style={{ backgroundColor: '#2d261e' }}
          onClick={startExperience}
        >
          <div className="text-center opacity-50" style={{ color: '#9a8b7a' }}>
            <div className="text-lg tracking-widest mb-8" style={{ fontFamily: 'Georgia, serif' }}>
              click to enter
            </div>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="block transition-transform duration-100"
        style={{
          opacity: hasStarted ? 1 - fadeIn : 0,
        }}
      />

      {/* Fade overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundColor: '#2d261e',
          opacity: fadeIn,
        }}
      />
    </div>
  )
}
