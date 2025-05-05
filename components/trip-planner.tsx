"use client";

import { searchCities } from "../lib/api";
import { useEffect, useState, Suspense } from "react";

import {
  format,
  addDays,
  isSameDay,
  isWithinInterval,
  differenceInDays,
} from "date-fns";
import { Calendar } from "../components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Plus, X, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { AddPersonForm } from "./add-person-form";
import { TripPreferences } from "./trip-preferences";
import { DateRangePicker } from "./date-range-picker";
import { supabase } from "../lib/supabaseClient";
import { nanoid } from "nanoid";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { type DateRange } from "react-day-picker";
import { PersonPayload } from "@/types/person-payload";


// Define types for flight data
interface FlightInfo {
  type: string;
  airline: string;
  airline_logo?: string;
  price: number;
  departure: {
    airport: string;
    time: string;
    iata_code: string;
  };
  arrival: {
    airport: string;
    time: string;
    iata_code: string;
  };
  duration_minutes: number;
  duration_formatted: string;
  flight_number: string;
  aircraft: string;
  departure_token: string;
  carbon_emissions_kg: number;
}

interface CityData {
  city_name: string;
  city_iata: string;
  flight_info: FlightInfo | null;
  return_flight_info: FlightInfo | null;
}

interface ApiResponse {
  cities: CityData[];
}
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

  const [inputValue, setInputValue] = useState("LGW");
  const [departureAirport, setDepartureAirport] = useState("LGW");

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

  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: addDays(new Date(), 60),
  });
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<string>("1");
  const [preferences, setPreferences] = useState<TripPreference[]>([
    { id: "1", label: "Beach", selected: false },
    { id: "2", label: "City", selected: false },
    { id: "3", label: "Party", selected: false },
    { id: "4", label: "Sun", selected: false },
    { id: "5", label: "Activity", selected: false },
    { id: "6", label: "Sights", selected: false },
  ]);
  const [aiResponse, setAiResponse] = useState<ApiResponse | null>(null);

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
        p.dateRange.to = new Date(p.dateRange.to);
        p.people = p.people.map((person: PersonPayload) => ({
          ...person,
          unavailableDates: person.unavailableDates.map(
            (s: string) => new Date(s)
          ),
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

  useEffect(() => {
    // Only set up realtime subscription if we have a shareId
    if (!shareId) return;

    console.log("Setting up realtime subscription for trip:", shareId);

    // Create a subscription channel
    const channel = supabase
      .channel(`public:trips:share_id=eq.${shareId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trips",
          filter: `share_id=eq.${shareId}`,
        },
        (payload) => {
          console.log("Real-time update received:", payload);

          // Extract the updated payload data
          const updatedData = payload.new.payload;

          if (!updatedData) return;

          // Parse ISO strings back into Date objects
          updatedData.dateRange.from = new Date(updatedData.dateRange.from);
          updatedData.dateRange.to = new Date(updatedData.dateRange.to);

          // Process people data to convert string dates to Date objects
          const updatedPeople = updatedData.people.map((person: PersonPayload) => ({
            ...person,
            unavailableDates: person.unavailableDates.map(
              (s: string) => new Date(s)
            ),
          }));

          console.log("Updating local state with new data:", updatedData);

          // Update all the relevant state
          if (updatedData.tripName) setTripName(updatedData.tripName);
          setDateRange(updatedData.dateRange);
          setTripDuration(updatedData.tripDuration);
          setTripCost(updatedData.tripCost);
          setInputValue(updatedData.departureAirport);
          setDepartureAirport(updatedData.departureAirport);
          setPeople(updatedPeople);
          setPreferences(updatedData.preferences);
        }
      )
      .subscribe();

    // Clean up the subscription when the component unmounts
    return () => {
      console.log("Cleaning up realtime subscription");
      supabase.removeChannel(channel);
    };
  }, [shareId]); // Only re-run if shareId changes

  async function handleSave() {
    if (!session) {
      alert("You must be signed in to save a trip.");
      return;
    }

    const userId = session.user?.id;
    const tripShareId = shareId || nanoid(8);

    const payload = {
      tripName,
      dateRange,
      tripDuration,
      tripCost,
      departureAirport: inputValue,
      people: people.map((p) => ({
        ...p,
        unavailableDates: p.unavailableDates.map((d) => d.toISOString()),
      })),
      preferences,
    };

    const { error } = await supabase
      .from("trips")
      .upsert(
        { share_id: tripShareId, user_id: userId, payload },
        { onConflict: "share_id" }
      );

    if (error) {
      console.error("Error saving trip:", error);
      return;
    }

    const url = `${window.location.origin}/trip-planner?share=${tripShareId}`;

    // Only redirect if this is a new trip (not editing an existing one)
    if (!shareId) {
      navigator.clipboard.writeText(url);
      alert("Shareable link copied!");
      window.location.href = url;
    } else {
      // For existing trips, just show a notification that changes were saved
      navigator.clipboard.writeText(url);
      alert("Trip updated successfully!");
    }
  }

  const handleRemovePerson = (id: string) => {
    setPeople(people.filter((person) => person.id !== id));
    if (selectedPerson === id) {
      setSelectedPerson(people[0].id);
    }
  };

  const normalizeDate = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const handleDateRangePickerChange = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range);
    }
  };

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;

    const normalizedDate = normalizeDate(date);
    console.log("Normalized date:", normalizedDate);
    const personIndex = people.findIndex((p) => p.id === selectedPerson);
    if (personIndex === -1) return;

    const person = people[personIndex];
    const isUnavailable = person.unavailableDates.some((d) =>
      isSameDay(d, normalizedDate)
    );

    const updatedPeople = [...people];
    if (isUnavailable) {
      updatedPeople[personIndex] = {
        ...person,
        unavailableDates: person.unavailableDates.filter(
          (d) => !isSameDay(d, normalizedDate)
        ),
      };
    } else {
      updatedPeople[personIndex] = {
        ...person,
        unavailableDates: [...person.unavailableDates, normalizedDate],
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
        startDate: format(range.start, "yyyy-MM-dd"),
        endDate: format(range.end, "yyyy-MM-dd"),
        departureAirport: departureAirport,
      };
      console.log("Sending search params:", searchParams);
      const response = await searchCities(searchParams);
      console.log("Raw API response:", JSON.stringify(response, null, 2));
      setAiResponse(response);
    } catch (err) {
      console.error("API call failed:", err);
    }
  };

  const isDateUnavailable = (date: Date) => {
    const today = normalizeDate(date);
    return people.some((p) =>
      p.unavailableDates.some((d) => isSameDay(normalizeDate(d), today))
    );
  };

  function findAvailableDates() {
    if (!dateRange || !dateRange.from || !dateRange.to) return [];

    // total full days inclusive of both endpoints:
    const totalDays = differenceInDays(dateRange.to, dateRange.from) + 1;
    const maxStartOffset = totalDays - tripDuration;
    if (maxStartOffset < 0) return [];

    const availableDates: { start: Date; end: Date }[] = [];

    for (let offset = 0; offset <= maxStartOffset; offset++) {
      const startDate = normalizeDate(addDays(dateRange.from, offset));
      const endDate = normalizeDate(addDays(startDate, tripDuration - 1));

      // reset for each candidate range
      let isAvailable = true;

      // check every person against every day in the window
      for (const person of people) {
        for (let day = 0; day < tripDuration; day++) {
          const current = normalizeDate(addDays(startDate, day));
          if (person.unavailableDates.some((d) => isSameDay(d, current))) {
            console.log("Person is unavailable on:", current);
            isAvailable = false;
            break; // stop checking this person
          }
        }
        if (!isAvailable) break; // stop checking other people
      }

      if (isAvailable) {
        availableDates.push({ start: startDate, end: endDate });
      }
    }

    return availableDates;
  }

  const availableDateRanges = findAvailableDates();

  const isDateInAvailableRange = (date: Date) => {
    if (!availableDateRanges || availableDateRanges.length === 0) return false;
    return availableDateRanges.some(
      (range) =>
        range &&
        range.start &&
        range.end &&
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
                    console.log("Departure airport set to:", inputValue);
                  }}
                >
                  OK
                </Button>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="secondary" onClick={handleSave}>
                Save This Trip
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
                onDateRangeChange={handleDateRangePickerChange}
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
                onSelect={(date) => date && handleDateClick(date)}
                disabled={(date) => {
                  if (!dateRange || !dateRange.from || !dateRange.to)
                    return true;
                  return date < dateRange.from || date > dateRange.to;
                }}
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
      {aiResponse && aiResponse.cities && aiResponse.cities.length > 0 ? (
        <div className="mt-4 p-4 bg-gray-100 border rounded-md">
          <h2 className="text-xl font-semibold mb-3">Suggested Cities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
            {aiResponse.cities.map((cityData: CityData, index: number) => (
              <div
                key={index}
                className="p-4 border rounded-lg shadow-sm bg-white hover:shadow-md transition"
              >
                <h3 className="text-lg font-semibold capitalize">
                  {cityData.city_name}
                </h3>
                <div className="mt-2">
                  <p className="text-gray-500">
                    Airport:{" "}
                    <span className="font-mono">{cityData.city_iata}</span>
                  </p>

                  {/* Flight Information */}
                  {cityData.flight_info ? (
                    <div className="mt-3 pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Total Price</h4>
                        <span className="text-lg font-bold">
                          £
                          {(
                            Number(cityData.flight_info?.price || 0) +
                            Number(cityData.return_flight_info?.price || 0)
                          ).toFixed(2)}
                        </span>
                      </div>

                      {/* Outbound Flight */}
                      <div className="mt-3 p-2 bg-gray-50 rounded-md">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {cityData.flight_info?.airline_logo && (
                              <img
                                src={cityData.flight_info.airline_logo}
                                alt={cityData.flight_info?.airline}
                                className="h-6 w-6 object-contain"
                              />
                            )}
                            <span className="font-medium">Outbound</span>
                          </div>
                          <span className="font-semibold">
                            £{cityData.flight_info?.price}
                          </span>
                        </div>
                        <div className="text-sm mt-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Flight:{" "}
                              <span className="font-mono">
                                {cityData.flight_info?.flight_number || "N/A"}
                              </span>
                            </span>
                            <span className="text-gray-600">
                              {cityData.flight_info?.airline}
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-600 mt-1">
                            <span>
                              {cityData.flight_info?.departure?.time} →{" "}
                              {cityData.flight_info?.arrival?.time}
                            </span>
                            <span>
                              {cityData.flight_info?.duration_formatted}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Return Flight */}
                      {cityData.return_flight_info ? (
                        <div className="mt-2 p-2 bg-gray-50 rounded-md">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              {cityData.return_flight_info?.airline_logo && (
                                <img
                                  src={cityData.return_flight_info.airline_logo}
                                  alt={cityData.return_flight_info?.airline}
                                  className="h-6 w-6 object-contain"
                                />
                              )}
                              <span className="font-medium">Return</span>
                            </div>
                            <span className="font-semibold">
                              £{cityData.return_flight_info?.price}
                            </span>
                          </div>
                          <div className="text-sm mt-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Flight:{" "}
                                <span className="font-mono">
                                  {cityData.return_flight_info?.flight_number ||
                                    "N/A"}
                                </span>
                              </span>
                              <span className="text-gray-600">
                                {cityData.return_flight_info?.airline}
                              </span>
                            </div>
                            <div className="flex justify-between text-gray-600 mt-1">
                              <span>
                                {cityData.return_flight_info?.departure?.time} →{" "}
                                {cityData.return_flight_info?.arrival?.time}
                              </span>
                              <span>
                                {
                                  cityData.return_flight_info
                                    ?.duration_formatted
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 p-2 bg-amber-50 rounded-md">
                          <div className="text-amber-700 text-sm">
                            Return flight information not available
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 p-3 bg-amber-50 text-amber-700 rounded-md text-sm">
                      No flights available for this destination
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : aiResponse ? (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h2 className="text-xl font-semibold mb-2 text-yellow-800">
            Loading Results
          </h2>
          <p className="text-yellow-700">
            We&apos;re finding flight options for your selected dates. This may
            take a moment...
          </p>
        </div>
      ) : null}
    </div>
  );
}

// This component will use useSearchParams
function TripPlannerWithSearchParams() {
  return <TripPlanner />;
}

// Modify your export to use Suspense
export function TripPlannerWrapper() {
  return (
    <Suspense fallback={<div>Loading trip...</div>}>
      <TripPlannerWithSearchParams />
    </Suspense>
  );
}
