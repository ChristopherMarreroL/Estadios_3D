import type { StadiumSeat } from "@/types";
const statuses: StadiumSeat["status"][] = [
  "available",
  "available",
  "available",
  "occupied",
  "available",
  "reserved",
  "available",
  "available",
  "accessible",
  "available",
];
export const seats: StadiumSeat[] = ["A", "B", "C", "D"].flatMap(
  (row, rowIndex) =>
    Array.from({ length: 10 }, (_, index) => ({
      id: `palco-aa-left-${row}-${index + 1}`,
      sectionId: "palco-aa-left",
      row,
      number: index + 1,
      status: statuses[(index + rowIndex * 3) % statuses.length],
      price: 2500,
      position: [(index - 4.5) * 0.7, rowIndex * 0.35, rowIndex * 0.65] as [
        number,
        number,
        number,
      ],
    })),
);
export const getSeatsForSection = (sectionId: string, price = 2500) =>
  seats.map((seat) => ({
    ...seat,
    id: seat.id.replace("palco-aa-left", sectionId),
    sectionId,
    price,
  }));
