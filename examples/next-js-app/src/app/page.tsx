"use client";
import { tw } from "tailwind-styled-v4";
import { useState } from "react";

const Heading = tw.h1`text-3xl font-extrabold text-gray-900`;
const Container = tw.div`max-w-4xl mx-auto py-12 px-4 space-y-8`;

const Alert = tw.div`relative flex gap-3 rounded-lg p-4 border-l-4 text-sm`;
const InfoAlert = Alert.extend`border-l-blue-500 bg-blue-50 text-blue-800`;
const SuccessAlert = Alert.extend`border-l-green-500 bg-green-50 text-green-800`;

const CardBase = tw.article`rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden p-6`;
const HoverableCard = CardBase.extend`transition-all hover:-translate-y-1 hover:shadow-md`;

const PrimaryButton = tw.button`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition`;
const DangerButton = PrimaryButton.extend`bg-red-600 hover:bg-red-700`;

const Section = tw.section``;
const SectionTitle = tw.h2`text-xl font-bold mb-3`;
const CardGrid = tw.div`grid md:grid-cols-2 gap-4`;
const AlertStack = tw.div`space-y-3`;
const CounterRow = tw.div`flex items-center gap-3`;
const CardTitle = tw.h3`font-semibold text-gray-900`;
const CardDescription = tw.p`text-gray-500 mt-1`;

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <CounterRow>
      <PrimaryButton onClick={() => setCount((c) => c + 1)}>
        Count: {count}
      </PrimaryButton>
      <DangerButton onClick={() => setCount(0)}>Reset</DangerButton>
    </CounterRow>
  );
}

export default function Page() {
  return (
    <Container>
      <Heading>tailwind-styled-v4 — Next.js Example</Heading>

      <Section>
        <SectionTitle>Card Variants</SectionTitle>
        <CardGrid>
          <CardBase>
            <CardTitle>Default Card</CardTitle>
            <CardDescription>Standard card with tw.article</CardDescription>
          </CardBase>
          <HoverableCard>
            <CardTitle>Hoverable Card</CardTitle>
            <CardDescription>Hover me! Uses .extend()</CardDescription>
          </HoverableCard>
        </CardGrid>
      </Section>

      <Section>
        <SectionTitle>Alert Variants</SectionTitle>
        <AlertStack>
          <InfoAlert>
            <span>ℹ️</span>
            <span>Info alert — uses .extend() for color variants</span>
          </InfoAlert>
          <SuccessAlert>
            <span>✅</span>
            <span>Success alert — compiler transforms tw.div template</span>
          </SuccessAlert>
        </AlertStack>
      </Section>

      <Section>
        <SectionTitle>Button + useState (Client Component)</SectionTitle>
        <Counter />
      </Section>
    </Container>
  );
}
