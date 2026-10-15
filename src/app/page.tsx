import { TicketMapExperience } from "@/components/booking/TicketMapExperience";
import assets from "@/data/stadium-assets.json";

export default function Home() {
  return (
    <>
      <link
        rel="preload"
        as="fetch"
        href={assets.map.url}
        crossOrigin="anonymous"
      />
      <TicketMapExperience />
    </>
  );
}
