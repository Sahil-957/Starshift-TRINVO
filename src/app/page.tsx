import Hero from "@/components/Hero";
import ProductRail from "@/components/ProductRail";
import SpecSheet from "@/components/SpecSheet";
import Configurator from "@/components/Configurator";
import Manifesto from "@/components/Manifesto";
import Reviews from "@/components/Reviews";
import Signal from "@/components/Signal";

export default function Home() {
  return (
    <>
      <Hero />
      <ProductRail />
      <SpecSheet />
      <Configurator />
      <Manifesto />
      <Reviews />
      <Signal />
    </>
  );
}
