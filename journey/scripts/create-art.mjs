import { writeFileSync } from "node:fs";
let seed = 31;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
let buildings = "";
for (let i = 0; i < 74; i++) {
  const x = i * 16 - 8,
    w = 12 + rand() * 22,
    h = 40 + rand() * 210,
    y = 390 - h;
  buildings += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${["#203039", "#24333f", "#1b2c37", "#304050"][i % 4]}"/>`;
  for (let yy = y + 8; yy < 389; yy += 9)
    for (let xx = x + 4; xx < x + w - 3; xx += 6)
      if (rand() > 0.38)
        buildings += `<rect x="${xx}" y="${yy}" width="2" height="3" fill="${rand() > 0.4 ? "#e3b67f" : "#9acbd0"}" opacity="${0.2 + rand() * 0.6}"/>`;
}
writeFileSync(
  "public/images/hong-kong.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#122e43"/><stop offset=".5" stop-color="#676c7b"/><stop offset=".8" stop-color="#c19383"/><stop offset="1" stop-color="#dbb49a"/></linearGradient><linearGradient id="water" x2="0" y2="1"><stop stop-color="#45616c"/><stop offset="1" stop-color="#102f3d"/></linearGradient><pattern id="windows" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="3" height="5" fill="#f3cb91" opacity=".65"/></pattern></defs><path fill="url(#sky)" d="M0 0h1200v600H0z"/><path d="M0 285L90 230l50 15 70-60 80 42 80-20 75 50 80-70 65 30 90-45 110 54 100-20 80 50 50-45 95 65v100H0z" fill="#334452" opacity=".7"/><path fill="url(#water)" d="M0 390h1200v210H0z"/>${buildings}<path d="M766 390V137l16-28 14 28v253z" fill="#18333d"/><path d="M770 144h22v241h-22z" fill="url(#windows)"/><path d="M475 390V197l36-45 26 45v193z" fill="#253c4b"/><path d="M475 197l62 193M511 152v238M537 197l-62 193" stroke="#c2d1d6" stroke-width="3" fill="none"/><path d="M955 390V193l10-16h22l10 16v197" fill="#243a47"/><path d="M961 205h30v180h-30z" fill="url(#windows)"/><g fill="#d9b583" opacity=".2">${Array.from({ length: 80 }, () => `<rect x="${rand() * 1200}" y="${400 + rand() * 180}" width="${10 + rand() * 60}" height="2"/>`).join("")}</g><path d="M0 540q150-60 300-12t300 16 300-35 300 10v81H0z" fill="#0e2834"/><path d="M0 560q200-45 400-5t400-20 400-5" stroke="#d9ae72" fill="none" stroke-width="3" opacity=".5"/></svg>`,
);
writeFileSync(
  "public/images/lounge.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600"><defs><linearGradient id="room" x2="1" y2="1"><stop stop-color="#63533e"/><stop offset="1" stop-color="#272f2a"/></linearGradient><linearGradient id="view" x2="0" y2="1"><stop stop-color="#a3b6b4"/><stop offset="1" stop-color="#e0cfad"/></linearGradient><linearGradient id="seat" x2="0" y2="1"><stop stop-color="#b29672"/><stop offset="1" stop-color="#72614e"/></linearGradient></defs><path fill="url(#room)" d="M0 0h1000v600H0z"/><path fill="#b7a98c" d="M0 420h1000v180H0z"/><path fill="url(#view)" d="M70 60h800v330H70z"/><path fill="#8f9c97" d="M70 310l100-70 110 40 60-20 110 75 80-65 80 35 80-40 120 65 60-40v100H70z"/><g stroke="#514c3e" stroke-width="15"><path d="M60 35v380M260 35v380M460 35v380M660 35v380M860 35v380M40 50h850M40 390h850"/></g><path d="M0 0h1000v36H0z" fill="#2d302a"/><g fill="#dbc49c">${[120, 380, 650, 920].map((x) => `<path d="M${x} 0v95" stroke="#262d27" stroke-width="3"/><path d="M${x - 45} 95q45-50 90 0z"/><ellipse cx="${x}" cy="97" rx="45" ry="5" fill="#ffdfa2"/>`).join("")}</g><g fill="url(#seat)"><rect x="75" y="360" width="205" height="115" rx="25"/><rect x="55" y="425" width="245" height="85" rx="24"/><rect x="600" y="360" width="205" height="115" rx="25"/><rect x="580" y="425" width="245" height="85" rx="24"/></g><g fill="#3b3930"><rect x="75" y="505" width="12" height="40"/><rect x="270" y="505" width="12" height="40"/><rect x="600" y="505" width="12" height="40"/><rect x="800" y="505" width="12" height="40"/><ellipse cx="435" cy="465" rx="95" ry="25"/><rect x="428" y="465" width="14" height="75"/></g><path d="M897 450q-80-120 0-190-15 85 0 130 50-160 85-135-10 100-85 195" fill="#34483b"/><path d="M850 445h100l-18 100h-64z" fill="#c5b596"/></svg>`,
);
