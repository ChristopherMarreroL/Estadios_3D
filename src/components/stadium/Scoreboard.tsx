"use client";
import { Html } from "@react-three/drei";
export function Scoreboard() {
  return (
    <group position={[0, 4.8, -14]}>
      <mesh>
        <boxGeometry args={[6.3, 3.5, 0.55]} />
        <meshStandardMaterial
          color="#111c25"
          metalness={0.4}
          roughness={0.55}
        />
      </mesh>
      <mesh position={[0, 0, 0.3]}>
        <planeGeometry args={[5.65, 2.8]} />
        <meshStandardMaterial
          color="#06101b"
          emissive="#092c57"
          emissiveIntensity={0.6}
        />
      </mesh>
      <Html transform position={[0, 0, 0.34]} distanceFactor={7}>
        <div className="w-[240px] text-center text-white select-none">
          <p className="utility text-[7px] text-[#f6cc7c]">
            Estadio Quisqueya · 7:30 p. m.
          </p>
          <div className="display mt-2 flex items-center justify-center gap-3 text-xl">
            <span className="text-[#62a2ff]">Licey</span>
            <b className="text-white">0—0</b>
            <span className="text-[#ff747e]">Escogido</span>
          </div>
          <p className="utility mt-2 text-[8px] text-white/70">
            Entrada 1 · 0 outs
          </p>
        </div>
      </Html>
      <Html center position={[0, 2.3, 0.1]} distanceFactor={8}>
        <span className="display text-4xl whitespace-nowrap text-[#f6cc7c] drop-shadow-[0_0_14px_rgba(246,204,124,.5)]">
          411 FT
        </span>
      </Html>
      <mesh position={[-2.6, -3, 0]}>
        <boxGeometry args={[0.25, 3, 0.25]} />
        <meshStandardMaterial color="#56616d" />
      </mesh>
      <mesh position={[2.6, -3, 0]}>
        <boxGeometry args={[0.25, 3, 0.25]} />
        <meshStandardMaterial color="#56616d" />
      </mesh>
    </group>
  );
}
