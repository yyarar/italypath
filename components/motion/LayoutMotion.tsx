"use client";

import { LazyMotion, type FeatureBundle } from "framer-motion";

// Kok (RouteTransition) yalnizca domAnimation yukler: animate/exit/variants, hover/tap/focus, whileInView.
// layout ve layoutId kullanan bilesenler bu sarmalayicinin icinde olmalidir; yerlesim ozellikleri
// (domMax) ilk ihtiyacta ayri paket olarak gelir (guvenlik ve optimizasyon denetimi O3#10, 2026-09-26).
// Paket bir kez yuklendikten sonra sonraki sarmalayicilar onu esanli alir; boylece okul -> program
// gecisindeki ortak baslik (layoutId) yeni sayfa ilk kez cizilirken hazirdir.
let layoutFeatures: FeatureBundle | null = null;

function loadLayoutFeatures() {
  return import("./layoutFeatures").then((mod) => {
    layoutFeatures = mod.default;
    return mod.default;
  });
}

export default function LayoutMotion({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={layoutFeatures ?? loadLayoutFeatures}>{children}</LazyMotion>;
}
