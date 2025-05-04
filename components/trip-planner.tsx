"use client";

import { useEffect, useState } from "react";
import {
  format,
  addDays,
  isSameDay,
  isWithinInterval,
  differenceInDays,
} from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, X, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddPersonForm } from "./add-person-form";
import { TripPreferences } from "./trip-preferences";
import { DateRangePicker } from "./date-range-picker";
import { searchCities } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import { nanoid } from "nanoid";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export type Person = {
  id: string;
  name: string;
  unavailableDates: Date[];
};

export type TripPreference = {
  id: string;
  label: string;
  selected: boolean;
};

export function TripPlanner() {
  const [tripName, setTripName] = useState("Summer Vacation");
  const [inputValue, setInputValue] = useState('LGW');
  const [departureAirport, setDepartureAirport] = useState('LGW');
  
  // Load trip from share link
  const params = useSearchParams();
  const { data: session } = useSession();
  const shareId = params.get("share");
  const [initialized, setInitialized] = useState(false);
  //

  const [selectedRangeIndex, setSelectedRangeIndex] = useState<number | null>(
    null
  );
  const [tripDuration, setTripDuration] = useState(7);
  const [tripCost, setTripCost] = useState(1000);
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: new Date(),
    to: addDays(new Date(), 60),
  });
  const [people, setPeople] = useState<Person[]>([
    {
      id: "1",
      name: "You",
      unavailableDates: [],
    },
  ]);
  const [selectedPerson, setSelectedPerson] = useState<string>("1");
  const [preferences, setPreferences] = useState<TripPreference[]>([
    { id: "1", label: "Beach", selected: false },
    { id: "2", label: "City", selected: false },
    { id: "3", label: "Party", selected: false },
    { id: "4", label: "Sun", selected: false },
    { id: "5", label: "Activity", selected: false },
    { id: "6", label: "Sights", selected: false },
  ]);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const handleAddPerson = (name: string) => {
    const newPerson = {
      id: Date.now().toString(),
      name,
      unavailableDates: [],
    };
    setPeople([...people, newPerson]);
    setSelectedPerson(newPerson.id);
  };

  useEffect(() => {
    if (!shareId || initialized) return;

    (async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("payload")
        .eq("share_id", shareId)
        .single();

      if (error || !data) {
        console.warn("No shared trip found:", error);
      } else {
        console.log("Shared trip found:", data);
        const p = data.payload;
        // parse ISO strings back into Date
        p.dateRange.from = new Date(p.dateRange.from);
        p.dateRange.to   = new Date(p.dateRange.to);
        p.people = p.people.map((person: any) => ({
          ...person,
          unavailableDates: person.unavailableDates.map((s: string) => new Date(s)),
        }));

        // hydrate state
        setDateRange(p.dateRange);
        setTripDuration(p.tripDuration);
        setTripCost(p.tripCost);
        setInputValue(p.departureAirport);
        setDepartureAirport(p.departureAirport);
        setPeople(p.people);
        setPreferences(p.preferences);
      }

      setInitialized(true);
    })();
  }, [shareId, initialized]);

  async function handleShare() {
    if (!session) {
      alert("You must be signed in to share a trip.");
      return;
    }
  
    const userId = session.user?.id;
    const shareId = nanoid(8);
  
    const payload = {
      dateRange,
      tripDuration,
      tripCost,
      departureAirport: inputValue,
      people: people.map(p => ({
        ...p,
        unavailableDates: p.unavailableDates.map(d => d.toISOString()),
      })),
      preferences,
    };
  
    const { error } = await supabase
      .from("trips")
      .upsert({ share_id: shareId, user_id: userId, payload }, { onConflict: "share_id" });
  
    if (error) {
      console.error("Error saving trip:", error);
      return;
    }
  
    const url = `${window.location.origin}/trip-planner?share=${shareId}`;
    navigator.clipboard.writeText(url);
    alert("Shareable link copied!");
  }

  const handleRemovePerson = (id: string) => {
    setPeople(people.filter((person) => person.id !== id));
    if (selectedPerson === id) {
      setSelectedPerson(people[0].id);
    }
  };

  const handleDateClick = (date: Date) => {
    const personIndex = people.findIndex((p) => p.id === selectedPerson);
    if (personIndex === -1) return;

    const person = people[personIndex];
    const isUnavailable = person.unavailableDates.some((d) =>
      isSameDay(d, date)
    );

    const updatedPeople = [...people];
    if (isUnavailable) {
      updatedPeople[personIndex] = {
        ...person,
        unavailableDates: person.unavailableDates.filter(
          (d) => !isSameDay(d, date)
        ),
      };
    } else {
      updatedPeople[personIndex] = {
        ...person,
        unavailableDates: [...person.unavailableDates, date],
      };
    }
    setPeople(updatedPeople);
  };

  const handleSelect = async (index: number) => {
    setSelectedRangeIndex(index);

    const range = availableDateRanges[index];

    // Get all selected preferences (tags)
    const selectedTags = preferences
      .filter((p) => p.selected)
      .map((p) => p.label);

    try {
      const searchParams = {
        tags: selectedTags,
        costPerPerson: tripCost,
        startDate: format(range.start, "MMM d, yyyy"),
        endDate: format(range.end, "MMM d, yyyy"),
      };
      const response = await searchCities(searchParams);
      setAiResponse(response.result);
      console.log("Suggested cities:", response.result);
    } catch (err) {
      console.error("API call failed:", err);
    }
  };

  const isDateUnavailable = (date: Date) => {
    const person = people.find((p) => p.id === selectedPerson);
    return person?.unavailableDates.some((d) => isSameDay(d, date)) || false;
  };

  const findAvailableDates = () => {
    if (!dateRange.from || !dateRange.to) return [];

    const availableDates = [];
    const totalDays = differenceInDays(dateRange.to, dateRange.from);

    for (let i = 0; i <= totalDays - tripDuration; i++) {
      const startDate = addDays(dateRange.from, i);
      const endDate = addDays(startDate, tripDuration - 1);

      let isAvailable = true;

      for (const person of people) {
        for (let j = 0; j < tripDuration; j++) {
          const currentDate = addDays(startDate, j);
          if (person.unavailableDates.some((d) => isSameDay(d, currentDate))) {
            isAvailable = false;
            break;
          }
        }
        if (!isAvailable) break;
      }

      if (isAvailable) {
        availableDates.push({
          start: startDate,
          end: endDate,
        });
      }
    }

    return availableDates;
  };

  const availableDateRanges = findAvailableDates();

  const isDateInAvailableRange = (date: Date) => {
    return availableDateRanges.some((range) =>
      isWithinInterval(date, { start: range.start, end: range.end })
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>
                <Input
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  className="text-2xl font-bold border-none p-0 h-auto focus-visible:ring-0"
                />
              </CardTitle>
              <CardDescription>
                Plan your trip with friends and family
              </CardDescription>
            </div>
            <div>
              <Label htmlFor="departure">Departure Airport (IATA)</Label>
              <div className="flex gap-2">
                <Input
                  id="departure"
                  maxLength={3}
                  className="w-24 uppercase"
                  placeholder="LGW"
                  value={inputValue}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setInputValue(value);
                  }}
                />
                <Button
                  onClick={() => {
                    setDepartureAirport(inputValue);
                    console.log('Departure airport set to:', inputValue);
                  }}
                >
                  OK
                </Button>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="secondary" onClick={handleShare}>
                Share This Trip
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <Label htmlFor="duration">Duration (days)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  value={tripDuration}
                  onChange={(e) =>
                    setTripDuration(Number.parseInt(e.target.value) || 1)
                  }
                  className="w-24"
                />
              </div>
              <div>
                <Label htmlFor="cost">Cost per person ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  min={0}
                  value={tripCost}
                  onChange={(e) =>
                    setTripCost(Number.parseInt(e.target.value) || 0)
                  }
                  className="w-24"
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Trip Calendar</CardTitle>
              <CardDescription>
                Select a date range for your trip and mark your unavailable days
              </CardDescription>
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {people.map((person) => (
                  <Badge
                    key={person.id}
                    variant={
                      selectedPerson === person.id ? "default" : "outline"
                    }
                    className="cursor-pointer flex items-center gap-1"
                    onClick={() => setSelectedPerson(person.id)}
                  >
                    {person.name}
                    {people.length > 1 && person.id !== "1" && (
                      <X
                        className="h-3 w-3 ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePerson(person.id);
                        }}
                      />
                    )}
                  </Badge>
                ))}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-6">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Person
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <AddPersonForm onAddPerson={handleAddPerson} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center justify-center mb-4 text-sm">
                <div className="flex items-center mr-4">
                  <div className="w-4 h-4 bg-red-200 rounded-sm mr-1"></div>
                  <span>Unavailable</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-200 rounded-sm mr-1"></div>
                  <span>Available for everyone</span>
                </div>
              </div>

              <Calendar
                mode="single"
                onSelect={handleDateClick}
                disabled={(date) =>
                  date < dateRange.from || date > dateRange.to
                }
                modifiers={{
                  unavailable: (date) => isDateUnavailable(date),
                  available: (date) => isDateInAvailableRange(date),
                }}
                modifiersClassNames={{
                  unavailable: "bg-red-200 text-red-900 hover:bg-red-300",
                  available: "bg-green-200 text-green-900 hover:bg-green-300",
                }}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </div>

        <div>
          <Tabs defaultValue="available-dates">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="available-dates">Available Dates</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>
            <TabsContent value="available-dates">
              <Card>
                <CardHeader>
                  <CardTitle>Available Dates</CardTitle>
                  <CardDescription>
                    Dates when everyone is available for {tripDuration} days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {availableDateRanges.length > 0 ? (
                      <div className="space-y-2">
                        {availableDateRanges.map((range, index) => (
                          <div
                            key={index}
                            className="p-3 border rounded-md flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium">
                                {format(range.start, "MMM d, yyyy")} -{" "}
                                {format(range.end, "MMM d, yyyy")}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {tripDuration} days
                              </div>
                            </div>
                            <Button
                              variant={
                                selectedRangeIndex === index
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => handleSelect(index)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              {selectedRangeIndex === index
                                ? "Selected"
                                : "Select"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No available dates found for everyone.
                        <br />
                        Try adjusting the trip duration or date range.
                      </div>
                    )}
                  </ScrollArea>
                  {aiResponse && (
                    <div className="mt-4 p-3 border rounded-md bg-gray-50">
                      <strong>Suggested Cities:</strong>
                      <div>{aiResponse}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle>Trip Preferences</CardTitle>
                  <CardDescription>
                    What are you looking for in this trip?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TripPreferences
                    preferences={preferences}
                    setPreferences={setPreferences}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
