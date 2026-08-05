"use client";

import { ListingError } from "@/components/listings/listing-error";

export default function Error({ reset }: { reset: () => void }) {
  return <ListingError reset={reset} />;
}
