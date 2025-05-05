export type PersonPayload = {
    id: string;
    name: string;
    unavailableDates: string[]; // In the payload, dates are stored as strings
  };