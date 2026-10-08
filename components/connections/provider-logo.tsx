import { useId } from "react";
import type { ProviderId } from "@/lib/connections/providers";
import { cn } from "@/lib/utils/cn";

/**
 * App-icon style marks for the tools Forma connects to, drawn as inline SVG
 * (no network requests, crisp at any size, fine in dark mode). The Canvas and
 * Google Calendar glyphs come from Simple Icons (CC0); the others are drawn
 * here after each product's app icon. Names and logos belong to their owners
 * and are shown only to say which tools work with Forma.
 */
export function ProviderLogo({ id, size = 40, className }: { id: ProviderId | string; size?: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const Mark = MARKS[id as ProviderId];
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-[22%] shadow-[0_1px_2px_rgb(0_0_0/0.12),0_0_0_0.5px_rgb(0_0_0/0.08)]", className)}
      aria-hidden
    >
      {Mark ? <Mark uid={uid} /> : <Fallback />}
    </svg>
  );
}

type MarkProps = { uid: string };

const MARKS: Record<ProviderId, (props: MarkProps) => React.ReactElement> = {
  schoology: Schoology,
  skyward: Skyward,
  canvas: Canvas,
  outlook: Outlook,
  google: GoogleCalendar,
  apple: AppleCalendar,
};

/** Schoology: a white "s" in a blue circle. */
function Schoology() {
  return (
    <>
      <rect width="40" height="40" fill="#ffffff" />
      <circle cx="20" cy="20" r="15" fill="#0b8ad4" />
      <path
        d="M24.6 15.1c-.9-1.5-2.6-2.4-4.7-2.4-3 0-5.1 1.7-5.1 4.1 0 2.6 2.2 3.4 4.4 3.9 1.7.4 2.6.7 2.6 1.6 0 .8-.8 1.4-2.1 1.4-1.4 0-2.5-.7-3.1-1.9l-2.6 1.5c.9 2 3 3.2 5.7 3.2 3.2 0 5.4-1.7 5.4-4.3 0-2.7-2.3-3.5-4.6-4-1.6-.4-2.4-.6-2.4-1.4 0-.7.7-1.2 1.8-1.2 1.1 0 1.9.5 2.4 1.3z"
        fill="#ffffff"
      />
    </>
  );
}

/** Skyward: an upward swoosh on a deep blue-green tile. */
function Skyward({ uid }: MarkProps) {
  return (
    <>
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d8f5a" />
          <stop offset="1" stopColor="#0b5e38" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" fill={`url(#sky-${uid})`} />
      <path d="M8 27.5c6.5-.8 12.6-4.6 17.2-11.2l-3.4-.8 9.2-6 1 10.6-2.8-2.3C24.6 25.4 16.6 29.6 8 27.5z" fill="#ffffff" />
      <path d="M9 31.5h22" stroke="#ffffff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

/** Canvas LMS (Simple Icons, CC0), red on white. */
function Canvas() {
  return (
    <>
      <rect width="40" height="40" fill="#ffffff" />
      <g transform="translate(8 8)" fill="#e72429">
        <path d="M.4403 15.4142a13.7061 13.7061 0 0 1-.4362-3.4403 13.7 13.7 0 0 1 .4362-3.4401c1.7144.2103 3.0438 1.6686 3.0438 3.44 0 1.771-1.3287 3.23-3.0438 3.4404zm3.9728-3.4403c0 .6004.4866 1.0873 1.0872 1.0873.601 0 1.088-.487 1.088-1.0873s-.487-1.088-1.088-1.088c-.6006 0-1.0872.4876-1.0872 1.088zM23.56 8.5338c-1.7151.2103-3.044 1.6686-3.044 3.44 0 1.771 1.3289 3.23 3.044 3.4404a13.7313 13.7313 0 0 0 .436-3.4403c0-1.1883-.1518-2.3413-.436-3.4401zm-6.148 3.44c0 .6005.4865 1.0874 1.0877 1.0874.6002 0 1.088-.487 1.088-1.0873s-.4878-1.088-1.088-1.088c-.6012 0-1.0877.4876-1.0877 1.088zm-5.4347 8.5465c-1.7709 0-3.229 1.33-3.44 3.044a13.7364 13.7364 0 0 0 3.441.4357c1.1885 0 2.3403-.1515 3.44-.4357-.2107-1.714-1.6687-3.044-3.441-3.044zm.001-3.1046c-.6012 0-1.0878.4876-1.0878 1.0883s.4866 1.0882 1.0878 1.0882c.6 0 1.087-.4874 1.087-1.0882s-.487-1.0883-1.087-1.0883zm0-13.936c1.7713 0 3.2295-1.3292 3.4399-3.0438A13.7353 13.7353 0 0 0 11.9782 0c-1.1887 0-2.3412.1519-3.441.4359.211 1.7146 1.6691 3.0438 3.441 3.0438zm0 .9291c-.6012 0-1.0878.4866-1.0878 1.0876 0 .6002.4866 1.0876 1.0878 1.0876.6 0 1.087-.4874 1.087-1.0876 0-.601-.487-1.0876-1.087-1.0876zm6.032 13.5965c-1.2514 1.2523-1.344 3.2211-.2825 4.582a13.762 13.762 0 0 0 4.8636-4.8654c-1.3608-1.0597-3.3299-.9673-4.5812.2834zm-.6568-2.1948c-.425-.4245-1.1135-.4245-1.539 0-.4243.4252-.4243 1.1136 0 1.5383.4255.4253 1.114.4253 1.539 0 .424-.4247.424-1.1131 0-1.5383zM5.9648 5.9603c1.2516-1.2513 1.3437-3.2206.2825-4.5813a13.7677 13.7677 0 0 0-4.8644 4.8643c1.3612 1.0616 3.3306.9687 4.582-.283zm.6567.6572c-.424.4247-.424 1.1139 0 1.5383.4245.4246 1.114.4246 1.5382 0 .4248-.4244.4248-1.1136 0-1.5383-.4243-.4243-1.1137-.4243-1.5382 0zm15.9625-.3857a13.7597 13.7597 0 0 0-4.8637-4.8642c-1.0614 1.3609-.969 3.33.2823 4.5818 1.2517 1.2507 3.2204 1.3436 4.5814.2824zM17.346 8.1443c.4237-.4248.4237-1.1135 0-1.5383-.425-.4247-1.1145-.4247-1.5388 0-.4241.4248-.4241 1.1135 0 1.5383.4243.4243 1.1137.4243 1.5388 0zM1.3772 17.7087a13.763 13.763 0 0 0 4.8647 4.8654c1.0613-1.3608.9685-3.3297-.2833-4.5818-1.2512-1.251-3.2204-1.3436-4.5814-.2836zm5.2385-1.9115c-.4238.4247-.4238 1.1136 0 1.5384.425.4246 1.1141.4246 1.5382 0 .425-.4248.425-1.1137 0-1.5384-.4241-.4245-1.1131-.4245-1.5382 0z" />
      </g>
    </>
  );
}

/** Outlook: the blue envelope with the "O" panel in front. */
function Outlook({ uid }: MarkProps) {
  return (
    <>
      <defs>
        <linearGradient id={`ol-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#28a8ea" />
          <stop offset="1" stopColor="#0364b8" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" fill="#ffffff" />
      <rect x="13" y="9" width="20" height="22" rx="2" fill={`url(#ol-${uid})`} />
      <path d="M13 17l10 6 10-6v12a2 2 0 0 1-2 2H15a2 2 0 0 1-2-2z" fill="#1490df" />
      <path d="M13 29l10-6 10 6v0a2 2 0 0 1-2 2H15a2 2 0 0 1-2-2z" fill="#28a8ea" opacity=".9" />
      <rect x="6" y="12" width="16" height="16" rx="2.2" fill="#0a5ea8" />
      <ellipse cx="14" cy="20" rx="4.1" ry="4.6" fill="none" stroke="#ffffff" strokeWidth="2.3" />
    </>
  );
}

/** Google Calendar (Simple Icons glyph, CC0) in the product's four colors. */
function GoogleCalendar() {
  return (
    <>
      <rect width="40" height="40" fill="#ffffff" />
      <g transform="translate(8 8)">
        <path
          fill="#4285f4"
          d="M18.316 5.684V0H1.895A1.894 1.894 0 0 0 0 1.895v16.421h5.684V5.684h12.632zm-7.207 6.25v-.065c.272-.144.5-.349.687-.617s.279-.595.279-.982c0-.379-.099-.72-.3-1.025a2.05 2.05 0 0 0-.832-.714 2.703 2.703 0 0 0-1.197-.257c-.6 0-1.094.156-1.481.467-.386.311-.65.671-.793 1.078l1.085.452c.086-.249.224-.461.413-.633.189-.172.445-.257.767-.257.33 0 .602.088.816.264a.86.86 0 0 1 .322.703c0 .33-.12.589-.36.778-.24.19-.535.284-.886.284h-.567v1.085h.633c.407 0 .748.109 1.02.327.272.218.407.499.407.843 0 .336-.129.614-.387.832s-.565.327-.924.327c-.351 0-.651-.103-.897-.311-.248-.208-.422-.502-.521-.881l-1.096.452c.178.616.505 1.082.977 1.401.472.319.984.478 1.538.477a2.84 2.84 0 0 0 1.293-.291c.382-.193.684-.458.902-.794.218-.336.327-.72.327-1.149 0-.429-.115-.797-.344-1.105a2.067 2.067 0 0 0-.881-.689zm2.093-1.931l.602.913L15 10.045v5.744h1.187V8.446h-.827l-2.158 1.557z"
        />
        <path fill="#fbbc04" d="M18.316 5.684H24v12.632h-5.684z" />
        <path fill="#34a853" d="M5.684 24h12.632v-5.684H5.684z" />
        <path fill="#1967d2" d="M22.105 0h-3.289v5.184H24V1.895A1.894 1.894 0 0 0 22.105 0z" />
        <path fill="#ea4335" d="M18.816 23.5l4.684-4.684h-4.684z" />
        <path fill="#188038" d="M0 22.105C0 23.152.848 24 1.895 24h3.289v-5.184H0z" />
      </g>
    </>
  );
}

/** Apple Calendar: the white page with a red weekday and the date. */
function AppleCalendar() {
  return (
    <>
      <rect width="40" height="40" fill="#ffffff" />
      <text x="20" y="13.2" textAnchor="middle" fontSize="7.2" fontWeight="600" letterSpacing=".3" fill="#ff3b30" fontFamily="-apple-system, system-ui, sans-serif">
        MON
      </text>
      <text x="20" y="32" textAnchor="middle" fontSize="19" fontWeight="300" fill="#1c1c1e" fontFamily="-apple-system, system-ui, sans-serif">
        17
      </text>
    </>
  );
}

function Fallback() {
  return (
    <>
      <rect width="40" height="40" fill="var(--surface-3)" />
      <rect x="11" y="12" width="18" height="17" rx="3" fill="none" stroke="var(--fg-subtle)" strokeWidth="2" />
      <path d="M11 17h18M16 9.5v5M24 9.5v5" stroke="var(--fg-subtle)" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}
