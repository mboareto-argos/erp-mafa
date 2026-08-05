"use client";

import { ListingError } from "@/components/listings/listing-error";

export default function PurchasesError({ reset }: { reset: () => void }) {
  return <main className="page-content"><ListingError reset={reset} /></main>;
}
