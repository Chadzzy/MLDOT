import passScreen from "./assets/reference-boarding-pass.png";
import sheetScreen from "./assets/reference-sheet.png";
import amberScreen from "./assets/reference-sheet-amber.png";

// Display exact regions of the supplied PNGs without redrawing their artwork.
// SVG viewports keep the original files intact and scale with the phone canvas.
function Artwork({ source, sourceHeight, box, className, label }) {
  return (
    <svg className={className} viewBox={box} role="img" aria-label={label}>
      <image href={source} width="375" height={sourceHeight} />
    </svg>
  );
}

export function PassLockup() {
  return (
    <Artwork
      source={passScreen}
      sourceHeight="812"
      box="32 157 177 26"
      className="pass-reference-lockup"
      label="Cathay Pacific · oneworld"
    />
  );
}

export function PassBenefits() {
  return (
    <Artwork
      source={sheetScreen}
      sourceHeight="1193"
      box="40 542 172 22"
      className="pass-reference-benefits"
      label="Membership, lounge, fast track and Wi-Fi"
    />
  );
}

export function PassCodeArtwork() {
  return (
    <Artwork
      source={passScreen}
      sourceHeight="812"
      box="121 480 133 133"
      className="reference-pass-code"
      label="Reference boarding code artwork. Not valid for travel."
    />
  );
}

export function LoungeArtwork() {
  return (
    <Artwork
      source={amberScreen}
      sourceHeight="1141"
      box="24 817 327 167"
      className="reference-lounge-artwork"
      label="First Class Lounge · Terminal 1, near Gate 63"
    />
  );
}
