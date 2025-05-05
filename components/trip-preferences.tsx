"use client";

import type React from "react";

import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";

interface TripPreference {
  id: string;
  label: string;
  selected: boolean;
}

interface TripPreferencesProps {
  preferences: TripPreference[];
  setPreferences: React.Dispatch<React.SetStateAction<TripPreference[]>>;
}

export function TripPreferences({
  preferences,
  setPreferences,
}: TripPreferencesProps) {
  const [newPreference, setNewPreference] = useState("");

  const togglePreference = (id: string) => {
    setPreferences(
      preferences.map((pref) =>
        pref.id === id ? { ...pref, selected: !pref.selected } : pref
      )
    );
  };

  const addPreference = () => {
    if (newPreference.trim()) {
      setPreferences([
        ...preferences,
        {
          id: Date.now().toString(),
          label: newPreference.trim(),
          selected: true,
        },
      ]);
      setNewPreference("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {preferences.map((pref) => (
          <Badge
            key={pref.id}
            variant={pref.selected ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => togglePreference(pref.id)}
          >
            {pref.label}
          </Badge>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add new preference"
          value={newPreference}
          onChange={(e) => setNewPreference(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addPreference();
            }
          }}
        />
        <Button type="button" onClick={addPreference} size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="pt-4">
        <h3 className="font-medium mb-2">Selected Preferences:</h3>
        <div className="text-sm text-muted-foreground">
          {preferences.filter((p) => p.selected).length > 0
            ? preferences
                .filter((p) => p.selected)
                .map((p) => p.label)
                .join(", ")
            : "No preferences selected yet"}
        </div>
      </div>
    </div>
  );
}
