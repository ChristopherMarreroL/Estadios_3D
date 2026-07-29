"use client";
import { useEffect, useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useTicketStore } from "@/stores/ticketStore";
const overview: [number, number, number] = [0, 24, -30];
export function CameraController() {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const section = useTicketStore((state) => state.section);
  const step = useTicketStore((state) => state.step);
  const resetKey = useTicketStore((state) => state.cameraResetKey);
  const selectedSeat = useTicketStore((state) => state.selectedSeats[0]);
  useEffect(() => {
    const control = controls.current;
    if (!control) return;
    let position = overview;
    let target: [number, number, number] = [0, 2, 0];
    if (section) {
      position = section.cameraPosition;
      target = section.cameraTarget;
    }
    if (step === "seatView" && section && selectedSeat) {
      const side =
        section.side === "left" ? -1 : section.side === "right" ? 1 : 0;
      position = [
        side * 5.5 + selectedSeat.number * 0.05,
        2.1 + selectedSeat.row.charCodeAt(0) * 0.01,
        6.5,
      ];
      target = [0, 0.4, 0];
    }
    const animatedTarget = {
      x: control.target.x,
      y: control.target.y,
      z: control.target.z,
    };
    control.enabled = false;
    const timeline = gsap.timeline({
      defaults: { duration: 1.25, ease: "power3.inOut" },
      onComplete: () => {
        control.enabled = true;
        control.update();
      },
    });
    timeline
      .to(
        camera.position,
        { x: position[0], y: position[1], z: position[2] },
        0,
      )
      .to(
        animatedTarget,
        {
          x: target[0],
          y: target[1],
          z: target[2],
          onUpdate: () => {
            control.target.set(
              animatedTarget.x,
              animatedTarget.y,
              animatedTarget.z,
            );
            camera.lookAt(control.target);
          },
        },
        0,
      );
    return () => {
      timeline.kill();
      control.enabled = true;
    };
  }, [camera, section, step, resetKey, selectedSeat]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.075}
      minDistance={7}
      maxDistance={38}
      maxPolarAngle={Math.PI / 2.05}
      target={[0, 2, 0]}
    />
  );
}
