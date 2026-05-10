import { readFileSync } from "node:fs";

const checks = [
  {
    file: "components/HeroSection.tsx",
    forbidden: [
      "PulsatingButton",
      "gradient-text",
      "blob",
      "t.hero.badge",
      "titleHighlight",
      "titleEnd",
      "animate-ping",
      "Sparkles",
    ],
  },
  {
    file: "components/FeaturesSection.tsx",
    forbidden: ["BentoGrid", "BentoCard", "Marquee", "AnimatedList", "BorderBeam"],
  },
  {
    file: "components/VelocityBridge.tsx",
    forbidden: ["ScrollVelocityContainer", "ScrollVelocityRow", "ItalyPathLine"],
  },
  {
    file: "components/BottomNav.tsx",
    forbidden: ["blur-md", "linear-gradient(135deg", "border-4 border-white"],
  },
  {
    file: "components/IseeSection.tsx",
    forbidden: ["Sparkles", "blur-3xl", "linear-gradient(135deg"],
  },
  {
    file: "components/ScholarshipsSection.tsx",
    forbidden: ["radial-gradient", "rounded-[2.5rem]", "blur-2xl"],
  },
];

const failures = [];

for (const check of checks) {
  const source = readFileSync(check.file, "utf8");
  for (const token of check.forbidden) {
    if (source.includes(token)) {
      failures.push(`${check.file} still contains forbidden token: ${token}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Editorial UI smoke check passed.");
