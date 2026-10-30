"use client";

import React from "react";
import { toast } from "sonner";

export function useFetch<T, Args extends unknown[]>(
  cb: (...args: Args) => Promise<T>,
) {
  const [data, setData] = React.useState<T | undefined>(undefined);
  const [loading, setLoading] = React.useState<boolean | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  const fn = async (...args: Args) => {
    setLoading(true);
    setError(null);

    try {
      const response = await cb(...args);
      setData(response);
      setLoading(false);
      return response;
    } catch (err) {
      const e = err as Error;
      setError(e);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fn, setData };
}
