"use client";
import { create } from "zustand";
import { featuredEvent } from "@/data/events";
import { SERVICE_FEE_RATE, MAX_SELECTED_SEATS } from "@/lib/constants";
import type {
  BaseballEvent,
  FlowStep,
  StadiumSeat,
  StadiumSection,
} from "@/types";
interface TicketState {
  event: BaseballEvent;
  section: StadiumSection | null;
  selectedSeats: StadiumSeat[];
  step: FlowStep;
  hoveredSectionId: string | null;
  cameraResetKey: number;
  isProcessing: boolean;
  orderId: string | null;
  selectSection: (section: StadiumSection) => void;
  setHoveredSection: (id: string | null) => void;
  toggleSeat: (seat: StadiumSeat) => void;
  removeSeat: (id: string) => void;
  setStep: (step: FlowStep) => void;
  resetCamera: () => void;
  setProcessing: (value: boolean) => void;
  setOrderId: (id: string) => void;
  restart: () => void;
}
export const useTicketStore = create<TicketState>((set) => ({
  event: featuredEvent,
  section: null,
  selectedSeats: [],
  step: "hero",
  hoveredSectionId: null,
  cameraResetKey: 0,
  isProcessing: false,
  orderId: null,
  selectSection: (section) =>
    set({ section, selectedSeats: [], step: "stadium" }),
  setHoveredSection: (hoveredSectionId) => set({ hoveredSectionId }),
  toggleSeat: (seat) =>
    set((state) => {
      const exists = state.selectedSeats.some((item) => item.id === seat.id);
      if (exists)
        return {
          selectedSeats: state.selectedSeats.filter(
            (item) => item.id !== seat.id,
          ),
        };
      if (state.selectedSeats.length >= MAX_SELECTED_SEATS) return state;
      return {
        selectedSeats: [
          ...state.selectedSeats,
          { ...seat, status: "selected" },
        ],
      };
    }),
  removeSeat: (id) =>
    set((state) => ({
      selectedSeats: state.selectedSeats.filter((seat) => seat.id !== id),
    })),
  setStep: (step) => set({ step }),
  resetCamera: () =>
    set((state) => ({
      cameraResetKey: state.cameraResetKey + 1,
      section: null,
    })),
  setProcessing: (isProcessing) => set({ isProcessing }),
  setOrderId: (orderId) => set({ orderId }),
  restart: () =>
    set({
      section: null,
      selectedSeats: [],
      step: "hero",
      orderId: null,
      cameraResetKey: 0,
    }),
}));
export const calculateTotals = (selectedSeats: StadiumSeat[]) => {
  const subtotal = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const fees = Math.round(subtotal * SERVICE_FEE_RATE);
  return { subtotal, fees, total: subtotal + fees };
};
