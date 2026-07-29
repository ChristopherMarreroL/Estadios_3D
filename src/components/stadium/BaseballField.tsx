"use client";
export function BaseballField() {
  const bases: [number, number, number][] = [
    [0, 0.12, 4.9],
    [-3.05, 0.12, 1.55],
    [0, 0.12, -1.8],
    [3.05, 0.12, 1.55],
  ];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[15, 64]} />
        <meshStandardMaterial color="#163e31" roughness={1} />
      </mesh>
      <mesh position={[0, 0.015, -1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[12.8, 64]} />
        <meshStandardMaterial color="#2a7b55" roughness={1} />
      </mesh>
      <mesh
        position={[0, 0.035, 1.55]}
        rotation={[-Math.PI / 2, 0, Math.PI / 4]}
      >
        <planeGeometry args={[6.2, 6.2]} />
        <meshStandardMaterial color="#a97843" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.055, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.1, 32]} />
        <meshStandardMaterial color="#bb8b55" />
      </mesh>
      {bases.map((position, index) => (
        <mesh
          key={index}
          position={position}
          rotation={[-Math.PI / 2, 0, Math.PI / 4]}
        >
          <boxGeometry args={[0.36, 0.36, 0.06]} />
          <meshStandardMaterial color="#f1eee5" />
        </mesh>
      ))}
      <mesh position={[-5.25, 0.08, -0.2]} rotation={[0, -0.62, 0]}>
        <boxGeometry args={[0.04, 0.03, 13]} />
        <meshBasicMaterial color="#f1eee5" />
      </mesh>
      <mesh position={[5.25, 0.08, -0.2]} rotation={[0, 0.62, 0]}>
        <boxGeometry args={[0.04, 0.03, 13]} />
        <meshBasicMaterial color="#f1eee5" />
      </mesh>
    </group>
  );
}
