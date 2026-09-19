import type { SVGProps } from "react";
import type { IssueType } from "@/schemas/issue";
type Props = SVGProps<SVGSVGElement> & { size?: number };
export function BrandMark({ size = 28, ...props }: Props) {
  return (
    <svg
      width={size}
      height={size + 6}
      viewBox="0 0 28 34"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M14 1C10 4 3 11 3 19a11 11 0 0 0 22 0C25 11 18 4 14 1Z"
        fill="currentColor"
      />
      <path
        d="M14 10v23M14 22l-6-5M14 27l6-5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function IssueMarkerIcon({
  type,
  selected,
}: {
  type: IssueType;
  selected: boolean;
}) {
  return (
    <svg
      width="42"
      height="54"
      viewBox="0 0 44 56"
      aria-hidden="true"
      className="marker-vector"
    >
      <path
        d="M22 2C10.95 2 2 10.5 2 21.5 2 34 14 43 22 53 30 43 42 34 42 21.5 42 10.5 33.05 2 22 2Z"
        fill={selected ? "#24584a" : "#fffefa"}
        stroke={selected ? "white" : "#24584a"}
        strokeWidth="2"
      />
      <g
        fill="none"
        stroke={selected ? "white" : "#24584a"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {type === "street_light" ? (
          <>
            <path d="M17 33V15c0-7 11-7 11 0v2M14 33h6" />
            <path
              d="M24 16h8c0-6-8-6-8 0Z"
              fill={selected ? "white" : "#24584a"}
            />
          </>
        ) : type === "sidewalk" ? (
          <>
            <path d="m12 30 9-9 5 3 7-8M10 28l4 4M30 14l5 5M19 15l3 5-1 5 4 7" />
          </>
        ) : (
          <>
            <path d="m15 30 6-17h2l6 17M11 33h22M17 24h10M19 19h6" />
            <path d="M14 29h16l2 4H12Z" fill={selected ? "white" : "#24584a"} />
          </>
        )}
      </g>
    </svg>
  );
}
