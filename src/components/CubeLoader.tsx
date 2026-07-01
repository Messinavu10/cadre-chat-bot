import { CadreCube } from "./CadreCube";

/**
 * Ask Cadre's "thinking" indicator: the Cadre cube with its faces breathing in sequence
 * (animation defined in globals.css under .cube-loader).
 */
export function CubeLoader() {
  return (
    <span
      className="cube-loader inline-flex"
      role="status"
      aria-label="Ask Cadre is thinking"
    >
      <CadreCube size={22} />
    </span>
  );
}
