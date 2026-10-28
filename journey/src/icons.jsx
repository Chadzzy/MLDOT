import brushwing from "./assets/brushwing.png";
const paths = {
  plane:
    "M22 12c0-1-1-1.5-2-1.5h-6L8 2H6l3 8.5H4L2 8H1l1 4-1 4h1l2-2.5h5L6 22h2l6-8.5h6c1 0 2-.5 2-1.5Z",
  home: "m3 10 9-7 9 7v10H3V10Zm6 10v-7h6v7",
  bag: "M5 7h14v14H5V7Zm4 0V4h6v3M8 11v6m8-6v6",
  user: "M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-3a8 8 0 0 1 16 0v3H4Z",
  grid: "M3 3h6v6H3V3Zm12 0h6v6h-6V3ZM3 15h6v6H3v-6Zm12 0h6v6h-6v-6Z",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  chevron: "m9 5 7 7-7 7",
  down: "m5 9 7 7 7-7",
  up: "m5 15 7-7 7 7",
  close: "m6 6 12 12M6 18 18 6",
  back: "m14 5-7 7 7 7",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  ticket: "M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5Zm12 0v3m0 3v2m0 3v3",
  clock: "M12 8v5l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  check: "m5 12 4 4L19 6",
  circleCheck: "m7 12 3 3 7-7M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  cloud: "M6 18a5 5 0 1 1 1-10 7 7 0 0 1 13 3 4 4 0 0 1-1 7H6Z",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2",
  moon: "M20 15A9 9 0 0 1 9 4 9 9 0 1 0 20 15Z",
  sign: "M12 3v19M4 5h13l4 4-4 4H4V5Z",
  map: "m2 5 7-3 6 3 7-3v17l-7 3-6-3-7 3V5Zm7-3v17m6-14v17",
  pin: "M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 1 1 14 0ZM14 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  coffee:
    "M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm12 0h2a3 3 0 0 1 0 6h-2M7 2v3m5-3v3M2 23h18",
  leaf: "M20 3C9 2 2 8 5 16c7 7 16 0 15-13ZM3 21 16 8",
  music:
    "M9 18V5l12-3v13M9 18a3 3 0 1 1-3-3c2 0 3 1 3 3Zm12-3a3 3 0 1 1-3-3c2 0 3 1 3 3Z",
  headphones: "M3 13v-1a9 9 0 0 1 18 0v1M3 12h4v9H3v-9Zm14 0h4v9h-4v-9Z",
  film: "M3 3h18v18H3V3Zm4 0v18M17 3v18M3 8h4m10 0h4M3 16h4m10 0h4",
  heart: "M20 4c-3-2-6 0-8 2-2-2-5-4-8-2-6 4 0 10 8 17 8-7 14-13 8-17Z",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  refresh: "M20 8a8 8 0 0 0-14-4L3 7m0-5v5h5M4 16a8 8 0 0 0 14 4l3-3m0 5v-5h-5",
  share: "M12 16V2m-5 5 5-5 5 5M5 10H3v12h18V10h-2",
  spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z",
  shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm-5 10 3 3 7-7",
  alert: "m12 2 11 19H1L12 2Zm0 6v6m0 3v1",
  info: "M12 11v6m0-10v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  settings: "M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6",
  seat: "M6 3v12h12v6M3 17h12m3-9h3v13M6 10h8",
  wifi: "M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0M12 20h0",
  external: "M14 3h7v7m0-7L10 14M10 3H3v18h18v-7",
};
export function Icon({ name, size = 22, className = "", ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.spark} />
    </svg>
  );
}
export function Wing({ className = "" }) {
  return (
    <span
      className={`brand-wing ${className}`}
      style={{
        maskImage: `url(${brushwing})`,
        WebkitMaskImage: `url(${brushwing})`,
      }}
      aria-hidden="true"
    />
  );
}
