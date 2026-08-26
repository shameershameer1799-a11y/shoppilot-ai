"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function SettingsForm({ storeName, supportEmail }: { storeName: string; supportEmail: string }) {
  const [name, setName] = useState(storeName);
  const [email, setEmail] = useState(supportEmail);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    // A full build would PATCH /api/business/settings here.
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <>
      <div className="mb-4"><label className="field-label">Business name</label><input className="field-input" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="mb-4"><label className="field-label">Support email</label><input className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <Button size="sm" onClick={handleSave}>{saved ? "Saved ✓" : "Save"}</Button>
    </>
  );
}
