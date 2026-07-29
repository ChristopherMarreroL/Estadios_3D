"use client";
import type { ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { sections } from "@/data/sections";
import { formatCurrency } from "@/lib/formatCurrency";
import { useTicketStore } from "@/stores/ticketStore";
export function StadiumPlaceholder() {
  const {
    section: hoveredSelected,
    hoveredSectionId,
    selectSection,
    setHoveredSection,
  } = useTicketStore();
  return (
    <group>
      {sections.map((item) => {
        const active = item.id === hoveredSelected?.id;
        const hovered = item.id === hoveredSectionId;
        const teamColor =
          item.teamIdentity === "licey"
            ? "#1468d4"
            : item.teamIdentity === "escogido"
              ? "#d13c48"
              : "#c09b58";
        const onEnter = (event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          document.body.style.cursor = "pointer";
          setHoveredSection(item.id);
        };
        const onLeave = () => {
          document.body.style.cursor = "default";
          setHoveredSection(null);
        };
        return (
          <group
            key={item.id}
            position={item.scenePosition}
            rotation={item.sceneRotation}
          >
            <mesh
              name={item.modelObjectName}
              scale={active || hovered ? 1.06 : 1}
              onPointerEnter={onEnter}
              onPointerLeave={onLeave}
              onClick={(event) => {
                event.stopPropagation();
                selectSection(item);
              }}
              castShadow
            >
              <boxGeometry
                args={[item.category === "bleachers" ? 5.8 : 5.2, 1.25, 3.2]}
              />
              <meshStandardMaterial
                color={active || hovered ? teamColor : "#26384e"}
                emissive={active || hovered ? teamColor : "#000000"}
                emissiveIntensity={active ? 0.35 : hovered ? 0.18 : 0}
                roughness={0.72}
                metalness={0.12}
              />
            </mesh>
            {hovered && (
              <Html center position={[0, 1.25, 0]} distanceFactor={12}>
                <div className="pointer-events-none w-44 rounded-sm border border-white/15 bg-[#071323]/95 p-3 text-white shadow-xl">
                  <p className="utility text-[8px] text-[#f6cc7c]">
                    {item.category}
                  </p>
                  <p className="mt-1 text-xs font-semibold">{item.name}</p>
                  <p className="mt-2 text-[10px] text-white/65">
                    {formatCurrency(item.price)} · {item.availableSeats}{" "}
                    disponibles
                  </p>
                </div>
              </Html>
            )}
          </group>
        );
      })}
      <mesh position={[0, 0.9, -13.8]}>
        <boxGeometry args={[26, 1.8, 0.3]} />
        <meshStandardMaterial color="#1b2b38" />
      </mesh>
    </group>
  );
}
