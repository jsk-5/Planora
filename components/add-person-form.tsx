"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

interface AddPersonFormProps {
  onAddPerson: (name: string) => void;
}

export function AddPersonForm({ onAddPerson }: AddPersonFormProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAddPerson(name.trim());
      setName("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Person Name</Label>
        <Input
          id="name"
          placeholder="Enter name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full">
        Add Person
      </Button>
    </form>
  );
}
