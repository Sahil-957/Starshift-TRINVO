import Hero from "@/components/Hero";
import ProductRail from "@/components/ProductRail";
import Turntable from "@/components/Turntable";
import SpecSheet from "@/components/SpecSheet";
import GoodToKnow from "@/components/GoodToKnow";
import Configurator from "@/components/Configurator";
import Manifesto from "@/components/Manifesto";
import Reviews from "@/components/Reviews";
import Signal from "@/components/Signal";

export default function Home() {
  return (
    <>
      <Hero />
      <ProductRail />
      <Turntable />
      <SpecSheet />
      <GoodToKnow />
      <Configurator />
      <Manifesto />
      <Reviews />
      <Signal />
    </>
  );
}
