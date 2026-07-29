"use client";
const towers: [number, number, number][] = [
  [-14, 0, 8],
  [14, 0, 8],
  [-14, 0, -8],
  [14, 0, -8],
];
export function LightTowers() {
  return (
    <group>
      {towers.map((position, index) => (
        <group key={index} position={position}>
          <mesh position={[0, 5, 0]}>
            <boxGeometry args={[0.22, 10, 0.22]} />
            <meshStandardMaterial color="#4c5967" metalness={0.65} />
          </mesh>
          <mesh position={[0, 10, 0]} rotation={[-0.12, 0, 0]}>
            <boxGeometry args={[2.3, 1.2, 0.3]} />
            <meshStandardMaterial
              color="#f5e7c4"
              emissive="#ffe8a3"
              emissiveIntensity={3}
            />
          </mesh>
          <pointLight
            position={[0, 9.5, 1]}
            intensity={index < 2 ? 22 : 14}
            distance={28}
            color="#ffe4a6"
          />
        </group>
      ))}
    </group>
  );
}
