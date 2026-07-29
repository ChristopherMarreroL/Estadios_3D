"use client";
import { Html } from "@react-three/drei";
const ads = [
  { p: [-10, 0.9, -9], r: 0.55, t: "Bebida oficial" },
  { p: [-6, 0.8, -12], r: 0.25, t: "Banco asociado" },
  { p: [6, 0.8, -12], r: -0.25, t: "Marca deportiva" },
  { p: [10, 0.9, -9], r: -0.55, t: "Conectando a la fanaticada" },
] as const;
export function AdvertisingBoards() {
  return (
    <group>
      {ads.map((ad, index) => (
        <group key={ad.t} position={ad.p} rotation={[0, ad.r, 0]}>
          <mesh>
            <boxGeometry args={[3.5, 1, 0.2]} />
            <meshStandardMaterial
              color={index % 2 ? "#c9a45d" : "#153c72"}
              roughness={0.55}
            />
          </mesh>
          <Html transform position={[0, 0, 0.12]} distanceFactor={12}>
            <span className="utility block w-44 text-center text-[8px] text-white">
              {ad.t}
            </span>
          </Html>
        </group>
      ))}
    </group>
  );
}
