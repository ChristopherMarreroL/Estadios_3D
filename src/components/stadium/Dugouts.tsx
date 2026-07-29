"use client";
import { Html } from "@react-three/drei";
export function Dugouts() {
  return (
    <group>
      <group position={[-5.1, 0.45, 4]}>
        <mesh>
          <boxGeometry args={[3, 0.7, 1.1]} />
          <meshStandardMaterial color="#0e438e" roughness={0.75} />
        </mesh>
        <Html center position={[0, 0.55, 0.58]} distanceFactor={14}>
          <span className="utility rounded-sm bg-[#1468d4] px-2 py-1 text-[7px] whitespace-nowrap text-white">
            Licey · placeholder
          </span>
        </Html>
      </group>
      <group position={[5.1, 0.45, 4]}>
        <mesh>
          <boxGeometry args={[3, 0.7, 1.1]} />
          <meshStandardMaterial color="#8f202c" roughness={0.75} />
        </mesh>
        <Html center position={[0, 0.55, 0.58]} distanceFactor={14}>
          <span className="utility rounded-sm bg-[#d13c48] px-2 py-1 text-[7px] whitespace-nowrap text-white">
            Escogido · placeholder
          </span>
        </Html>
      </group>
    </group>
  );
}
