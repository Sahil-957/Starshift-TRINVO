"use client";

import { useEffect } from "react";
import { cart } from "@/lib/cart";

/** Empties the cart once the order is confirmed paid. */
export default function ClearCart() {
  useEffect(() => cart.clear(), []);
  return null;
}
