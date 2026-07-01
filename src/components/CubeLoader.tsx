/**
 * A 3D rotating cube — Ask Cadre's "thinking" indicator, a nod to Cadre's brand mark.
 * Pure CSS (see the .cube styles in globals.css); no images or external assets.
 */
export function CubeLoader() {
  return (
    <div className="cube-scene" role="status" aria-label="Ask Cadre is thinking">
      <div className="cube">
        <span className="cube__face cube__face--front" />
        <span className="cube__face cube__face--back" />
        <span className="cube__face cube__face--right" />
        <span className="cube__face cube__face--left" />
        <span className="cube__face cube__face--top" />
        <span className="cube__face cube__face--bottom" />
      </div>
    </div>
  );
}
