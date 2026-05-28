import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import tadiLogo from '../../assets/tadi.jpg'

const PHOTOS = [
  { src: '/images/tadi1.jpeg', caption: 'Rocking the Daisies · Cape Town 2024' },
  { src: '/images/tadi2.jpeg', caption: 'SAFW SS25 · Johannesburg 2025' },
  { src: '/images/tadi3.jpeg', caption: 'Editorial · TADI wa NASHE 2025' },
]

const SLIDE_MS = 10000
const LOGO_MS  = 1000
const FLY_MS   = 850

export function IntroScreen() {
  const navigate = useNavigate()
  const [cur,        setCur]        = useState(0)
  const [kenKey,     setKenKey]     = useState(0)
  const [showLogo,   setShowLogo]   = useState(false)
  const [logoFlying, setLogoFlying] = useState(false)

  function doEnter() {
    navigate('/dashboard', { replace: true })
  }

  // Photo slideshow — switches to logo phase after last photo
  useEffect(() => {
    if (showLogo) return
    const t = setInterval(() => {
      setCur((prev) => {
        const next = prev + 1
        if (next >= PHOTOS.length) {
          clearInterval(t)
          setShowLogo(true)
          return prev
        }
        setKenKey((k) => k + 1)
        return next
      })
    }, SLIDE_MS)
    return () => clearInterval(t)
  }, [showLogo])

  // Logo phase: hold → fly → navigate
  useEffect(() => {
    if (!showLogo) return
    const t1 = setTimeout(() => setLogoFlying(true),       LOGO_MS)
    const t2 = setTimeout(() => doEnter(),     LOGO_MS + FLY_MS)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [showLogo])

  function goTo(n: number) {
    if (showLogo) return
    setCur((n + PHOTOS.length) % PHOTOS.length)
    setKenKey((k) => k + 1)
  }

  return (
    <div className="intro">

      {/* ── Photo slides ── */}
      <div className={`intro__slides ${showLogo ? 'intro__slides--hidden' : ''}`}>
        {PHOTOS.map((s, i) => (
          <div key={i} className={`intro__slide ${i === cur ? 'intro__slide--active' : ''}`}>
            <img
              key={i === cur ? kenKey : i}
              src={s.src}
              alt={s.caption}
              className={i === cur ? 'intro__img--ken' : ''}
            />
          </div>
        ))}
      </div>

      {/* ── Brand overlay (photos only) ── */}
      {!showLogo && (
        <div className="intro__overlay">
          <p className="intro__eyebrow">Johannesburg &middot; est. 2024</p>
          <h1 className="intro__brand">TADI wa NASHE</h1>
          <p className="intro__tagline">We belong to God</p>
        </div>
      )}

      {/* ── Logo slide ── */}
      {showLogo && (
        <div className="intro__logo-stage">
          <div className={`intro__logo-box ${logoFlying ? 'intro__logo-box--fly' : ''}`}>
            <img src={tadiLogo} alt="TADI wa NASHE" />
          </div>
        </div>
      )}

      {/* ── Skip ── */}
      <button className="intro__skip" onClick={doEnter}>Skip</button>

      {/* ── Arrows (photos only) ── */}
      {!showLogo && (
        <>
          <button className="intro__arrow intro__arrow--prev" onClick={() => goTo(cur - 1)} aria-label="Previous">&#8249;</button>
          <button className="intro__arrow intro__arrow--next" onClick={() => goTo(cur + 1)} aria-label="Next">&#8250;</button>
        </>
      )}

      {/* ── Counter & caption ── */}
      <p className="intro__counter">
        {String(cur + 1).padStart(2, '0')} / {String(PHOTOS.length + 1).padStart(2, '0')}
      </p>
      {!showLogo && <p className="intro__caption">{PHOTOS[cur].caption}</p>}
    </div>
  )
}
