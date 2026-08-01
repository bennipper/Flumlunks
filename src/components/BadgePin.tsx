import type { Badge } from "../content/schema";

/**
 * The signature element (BUILD.md §11): a struck enamel pin — brass rim, flat
 * colour, slight bevel, no gradient. The only place --brass appears on screen. The
 * same artwork is drawn onto the certificate and photo card via badgeDraw.ts.
 */
export function BadgePin({ badge, size = 72 }: { badge: Badge; size?: number }) {
  return (
    <figure
      style={{ margin: 0, textAlign: "center", width: size }}
      aria-label={`${badge.name} badge`}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-hidden>
        <circle cx="50" cy="50" r="49" fill="var(--brass)" />
        <circle
          cx="50"
          cy="50"
          r="49"
          fill="none"
          stroke="#8A651C"
          strokeWidth="2"
        />
        <path
          d="M50 1 A49 49 0 0 1 99 50"
          fill="none"
          stroke="#D8B25C"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="50" cy="50" r="40" fill={badge.colour} />
        <text
          x="50"
          y="50"
          dominantBaseline="central"
          textAnchor="middle"
          fill="#F7F5EE"
          style={{
            font: `700 42px "Oswald", "Arial Narrow", sans-serif`,
          }}
        >
          {badge.motif}
        </text>
      </svg>
    </figure>
  );
}
