import type { Mood } from "@/components/mascot/Dewy";

/** The guided tour: one step per screen, each line under 10 words, no numbers. */
export interface TourStep { screen: number; target: string; line: string; mood: Mood }

export const TOUR: TourStep[] = [
  { screen: 0, target: "[data-tour=jobs]", line: "These are four jobs at two data centres.", mood: "excited" },
  { screen: 1, target: "[data-widget=priority]", line: "Slide to trade carbon for water.", mood: "curious" },
  { screen: 2, target: "[data-widget=histogram]", line: "This is the real quantum run.", mood: "proud" },
  { screen: 3, target: "[data-widget=methods]", line: "Classical methods check every answer.", mood: "thinking" },
  { screen: 4, target: "[data-widget=chat]", line: "Ask me anything about the plan.", mood: "excited" },
  { screen: 5, target: "[data-widget=sources]", line: "Everything here is cited or labelled.", mood: "proud" },
];

/** Active tour step. "manual" shows Back/Next; "story" is driven by story mode. */
export type TourState = { step: number; mode: "manual" | "story" } | null;
