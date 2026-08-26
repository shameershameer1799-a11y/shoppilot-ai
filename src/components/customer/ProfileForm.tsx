"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [name, setName] = useState(fullName);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    // In a full build this would PATCH /api/profile. Kept local for the demo.
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <Card className="p-5">
        <h3 className="font-semibold mb-3.5">Account details</h3>
        <div className="mb-4"><label className="field-label">Full name</label><input className="field-input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="mb-4"><label className="field-label">Email</label><input className="field-input" defaultValue={email} disabled /></div>
        <Button size="sm" onClick={handleSave}>{saved ? "Saved ✓" : "Save Changes"}</Button>
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold mb-3.5">Shopping preferences</h3>
        <div className="mb-4"><label className="field-label">Preferred categories</label><input className="field-input" placeholder="Laptops, Headphones" /></div>
        <div className="mb-4"><label className="field-label">Budget range</label><input className="field-input" placeholder="₹5,000 – ₹90,000" /></div>
        <label className="flex items-center gap-2 text-sm text-slate-500"><input type="checkbox" defaultChecked /> Email me personalized deals</label>
      </Card>
    </div>
  );
}
