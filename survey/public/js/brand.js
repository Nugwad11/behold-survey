/*
 * Brand settings — edit this file to rename the product or change the copy.
 * Used by the survey page and the admin dashboard.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BRAND = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  return {
    name: "BEHOLD",
    monogram: "B",
    tagline: "Faith-first dating, built for Nigerians.",
    surveyTitle: "Christian Dating Survey",
    headline: "Help shape a dating app built on faith, not games.",
    intro:
      "We are building BEHOLD — a new Christian dating app designed for Nigerians who are tired of swiping, fake profiles and conversations that go nowhere. Your answers decide what we build first.",
    introNote:
      "Whether you are a committed Christian, exploring faith, or simply curious about faith-based dating, your perspective matters. You do not need to be using a dating app right now to take part.",
    duration: "5–7 minutes",
    questionCount: "About 30 questions",
    anonymity: "Anonymous by default",
    privacySummary:
      "We do not ask for your name or email unless you choose to join the follow-up list. Answers are stored on this survey's own server, never sold, and reported only in aggregate.",
    privacyDetails: [
      "Your responses are stored under a random ID, not your identity.",
      "We record basic technical details (browser type and a hashed, non-reversible network identifier) to prevent spam and duplicate submissions.",
      "Open-text answers may be quoted in research summaries with identifying details removed.",
      "You can ask for your response to be deleted at any time by contacting the survey owner with your response ID."
    ],
    footerNote:
      "This survey is independent product research. It is not a dating service and does not create profiles.",
    successHeadline: "Thank you — your answers are in.",
    successBody:
      "You have just helped shape a dating product built for Nigerians — one that puts faith, safety and real conversations first. We read every response.",
    adminTitle: "Research dashboard"
  };
});
