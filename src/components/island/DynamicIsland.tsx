import { IslandShell } from "./IslandShell";
import { IslandContent } from "./IslandContent";
import type { IslandController } from "../../hooks/useDynamicIsland";
import { useEffect, useState } from 'react';
import { SecondaryIsland } from './SecondaryIsland';

export function DynamicIsland({ island }: { island: IslandController }) {
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  useEffect(() => { if (island.expanded) setSecondaryOpen(false); }, [island.expanded]);
  return (
    <div className="island-position">
      <div className={`island-cluster ${secondaryOpen ? 'secondary-open' : ''}`}>
      <IslandShell island={island}>
        <IslandContent island={island} />
      </IslandShell>
      <SecondaryIsland island={island} open={secondaryOpen} setOpen={setSecondaryOpen} />
      </div>
    </div>
  );
}
