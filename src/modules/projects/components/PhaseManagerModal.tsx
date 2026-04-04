// src/modules/projects/components/PhaseManagerModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/modules/shared/components/Modal";
import { Button } from "@/modules/shared/components/Button";
import { PhasesBuilder } from "./PhasesBuilder";
import type { PhaseInput } from "../types";

interface PhaseManagerModalProps {
  open: boolean;
  onClose: () => void;
  phases: PhaseInput[];
  onSave: (phases: PhaseInput[]) => void;
}

export function PhaseManagerModal({
  open,
  onClose,
  phases,
  onSave,
}: PhaseManagerModalProps) {
  const [draft, setDraft] = useState<PhaseInput[]>(phases);

  // Sync draft when modal opens
  useEffect(() => {
    if (open) setDraft(phases);
  }, [open, phases]);

  function handleSave() {
    onSave(draft);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage Phases"
      description="Define the phases for this project. Milestones can be assigned to each phase."
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Phases
          </Button>
        </>
      }
    >
      <PhasesBuilder value={draft} onChange={setDraft} />
    </Modal>
  );
}
