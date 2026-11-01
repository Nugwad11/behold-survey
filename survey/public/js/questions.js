/*
 * BEHOLD — Christian Dating Survey
 * Single source of truth for every question, option and branching rule.
 * Loaded by the browser (window.SURVEY) and by the server (require) so that
 * the form and the CSV export can never drift apart.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SURVEY = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "1.0";

  var sections = [
    {
      id: "screening",
      eyebrow: "Section 1",
      title: "About you",
      blurb:
        "A few basics so we can understand different experiences. Nothing here identifies you personally."
    },
    {
      id: "history",
      eyebrow: "Section 2",
      title: "Your experience so far",
      blurb: "A little context about the apps you have used."
    },
    {
      id: "barriers",
      eyebrow: "Section 3",
      title: "What holds you back",
      blurb:
        "This is the heart of the survey. There are no wrong answers, and nothing you say will be traced back to you."
    },
    {
      id: "motivators",
      eyebrow: "Section 4",
      title: "What would win you over",
      blurb:
        "Imagine the app you wish existed. What would make you give it a try?"
    },
    {
      id: "pricing",
      eyebrow: "Section 5",
      title: "Pricing and trust",
      blurb:
        "Honest answers here help us keep the free tier genuinely useful instead of holding core features hostage."
    },
    {
      id: "open",
      eyebrow: "Section 6",
      title: "In your own words",
      blurb: "The answers we remember most are usually the ones written freely."
    },
    {
      id: "followup",
      eyebrow: "Section 7",
      title: "Stay involved",
      blurb:
        "Entirely optional. You can skip this section and still submit your answers."
    }
  ];

  var barrierOptions = [
    { value: "fakes", label: "Concerns about fake profiles, catfishing or 419 scams" },
    { value: "safety", label: "Safety concerns about meeting strangers" },
    { value: "privacy", label: "Privacy — being seen by people from my church or community" },
    { value: "superficial", label: "Too superficial — judging people on photos alone feels wrong" },
    { value: "ghosting", label: "Ghosting and disrespectful behaviour" },
    { value: "harassment", label: "Unwanted sexual or explicit messages" },
    { value: "faith-claim", label: "People claiming to be Christian but not living it" },
    { value: "pressure", label: "Pressure to compromise my values or boundaries" },
    { value: "paywalls", label: "Too many paywalls — everything useful costs money" },
    { value: "waste", label: "Feels like a waste of time (endless swiping, few real dates)" },
    { value: "quality", label: "Low-quality matches / people not looking for the same thing" },
    { value: "pool", label: "Small pool of serious Christian matches in Nigeria" },
    { value: "past", label: "Bad past experience (dates, matches, or the apps)" },
    { value: "irl", label: "I prefer meeting people in person — through church, family introductions or social events" },
    { value: "stigma", label: "Embarrassment or stigma about online dating in Nigerian Christian circles" },
    { value: "data", label: "Concerns about data privacy and how my information is used" },
    { value: "competition", label: "Too much competition / feels discouraging" },
    { value: "addictive", label: "App design feels addictive or manipulative" },
    { value: "other", label: "Other" }
  ];

  var motivatorOptions = [
    { value: "verified", label: "Mandatory identity and photo verification for every user" },
    { value: "values", label: "Matching based on faith, values and personality — not just photos" },
    { value: "church-verified", label: "Verification that someone is genuinely active in a church" },
    { value: "denomination", label: "Denomination or doctrine alignment filters" },
    { value: "boundaries", label: "Features that help me honour physical and emotional boundaries" },
    { value: "anti-ghosting", label: "Anti-ghosting features (conversation prompts, kind closure nudges)" },
    { value: "safety", label: "Stronger safety tools (date check-in, block/report that actually works)" },
    { value: "video", label: "Video or voice introductions before meeting in person" },
    { value: "curated", label: "A smaller, curated community of serious Nigerian believers" },
    { value: "events", label: "Church or fellowship events to meet people offline" },
    { value: "pricing", label: "Affordable Naira pricing — core features free, no manipulative paywalls" },
    { value: "visibility", label: "Better control over who sees my profile" },
    { value: "accountability", label: "Accountability options, such as a trusted friend seeing my matches" },
    { value: "pastor-ref", label: "Option to include a pastor or church leader as a reference" },
    { value: "none", label: "None of these would convince me", exclusive: true },
    { value: "other", label: "Other" }
  ];

  var appsOptions = [
    { value: "tinder", label: "Tinder" },
    { value: "bumble", label: "Bumble" },
    { value: "hinge", label: "Hinge" },
    { value: "badoo", label: "Badoo" },
    { value: "facebook-dating", label: "Facebook Dating" },
    { value: "naija-dating", label: "A Nigerian-specific dating app (e.g. NaijaSingles, Jibolove)" },
    { value: "upward", label: "Upward" },
    { value: "christian-mingle", label: "Christian Mingle" },
    { value: "other-faith", label: "Another faith-based app" },
    { value: "other-mainstream", label: "Another mainstream app" },
    { value: "other", label: "Other" }
  ];

  var questions = [
    /* ---------------- Section 1: screening ---------------- */
    {
      id: "age",
      section: "screening",
      type: "single",
      title: "What is your age?",
      required: true,
      options: [
        { value: "18-24", label: "18–24" },
        { value: "25-34", label: "25–34" },
        { value: "35-44", label: "35–44" },
        { value: "45-54", label: "45–54" },
        { value: "55-64", label: "55–64" },
        { value: "65+", label: "65 and above" }
      ]
    },
    {
      id: "gender",
      section: "screening",
      type: "single",
      title: "Which best describes your gender?",
      required: true,
      allowOther: true,
      otherLabel: "Please describe",
      options: [
        { value: "woman", label: "Woman" },
        { value: "man", label: "Man" },
        { value: "other", label: "Prefer to self-describe" },
        { value: "private", label: "Prefer not to say" }
      ]
    },
    {
      id: "location",
      section: "screening",
      type: "single",
      title: "Where in Nigeria do you currently live?",
      required: true,
      options: [
        { value: "lagos", label: "Lagos" },
        { value: "abuja", label: "Abuja (FCT)" },
        { value: "port-harcourt", label: "Port Harcourt" },
        { value: "ibadan", label: "Ibadan" },
        { value: "kano", label: "Kano" },
        { value: "benin", label: "Benin City" },
        { value: "enugu", label: "Enugu" },
        { value: "other-city", label: "Another major city or state capital" },
        { value: "small-town", label: "A smaller town or rural area" },
        { value: "diaspora", label: "I live outside Nigeria" },
        { value: "private", label: "Prefer not to say" }
      ]
    },
    {
      id: "relationship_status",
      section: "screening",
      type: "single",
      title: "Which best describes your relationship status?",
      required: true,
      options: [
        { value: "single-looking", label: "Single and searching" },
        { value: "single-open", label: "Single, not actively looking right now" },
        { value: "casually-dating", label: "Casually seeing someone" },
        { value: "relationship", label: "In a relationship" },
        { value: "married", label: "Married" },
        { value: "complicated", label: "It's complicated" },
        { value: "private", label: "Prefer not to say" }
      ]
    },
    {
      id: "church_attendance",
      section: "screening",
      type: "single",
      title: "How often do you attend church or a faith community?",
      required: true,
      options: [
        { value: "weekly", label: "Every week or more (including midweek services)" },
        { value: "monthly", label: "One to three times a month" },
        { value: "occasional", label: "A few times a year" },
        { value: "rarely", label: "Rarely" },
        { value: "never", label: "Never" },
        { value: "private", label: "Prefer not to say" }
      ]
    },
    {
      id: "denomination",
      section: "screening",
      type: "single",
      title: "Which church or Christian tradition do you belong to or feel closest to?",
      help: "This helps us understand whether church background matters when matching.",
      required: true,
      options: [
        { value: "rccg", label: "RCCG (Redeemed Christian Church of God)" },
        { value: "winners", label: "Winners' Chapel / Living Faith Church" },
        { value: "mfm", label: "MFM (Mountain of Fire and Miracles)" },
        { value: "anglican", label: "Anglican / Church of Nigeria" },
        { value: "catholic", label: "Catholic" },
        { value: "baptist", label: "Baptist" },
        { value: "methodist", label: "Methodist" },
        { value: "assemblies", label: "Assemblies of God / Foursquare" },
        { value: "cac", label: "CAC (Christ Apostolic Church)" },
        { value: "ecwa", label: "ECWA / SIM-related churches" },
        { value: "deeper-life", label: "Deeper Life Bible Church" },
        { value: "nondenom", label: "Non-denominational / Independent Pentecostal" },
        { value: "other-christian", label: "Another Christian denomination" },
        { value: "exploring", label: "Still exploring / not sure" },
        { value: "private", label: "Prefer not to say" }
      ]
    },
    {
      id: "faith_centrality",
      section: "screening",
      type: "scale",
      title: "How central is your Christian faith to how you approach dating and marriage?",
      help: "There is no right answer. Honesty helps us design better matching.",
      required: true,
      scale: {
        min: 1,
        max: 5,
        minLabel: "Not central",
        maxLabel: "Central to everything"
      }
    },
    {
      id: "app_status",
      section: "screening",
      type: "single",
      title: "Which statement best describes your history with dating apps?",
      required: true,
      options: [
        { value: "never", label: "I have never used a dating app" },
        { value: "lapsed", label: "I have used dating apps before but do not use them now" },
        { value: "current", label: "I currently use at least one dating app" }
      ]
    },

    /* ---------------- Section 2: history ---------------- */
    {
      id: "apps_used",
      section: "history",
      type: "multi",
      audience: "history",
      title: "Which dating apps have you used?",
      help: "Select all that apply.",
      required: true,
      allowOther: true,
      otherLabel: "Which other app?",
      options: appsOptions
    },
    {
      id: "usage_length",
      section: "history",
      type: "single",
      audience: "history",
      title: "How long did you actively use dating apps in total?",
      required: true,
      options: [
        { value: "under-1m", label: "Less than 1 month" },
        { value: "1-6m", label: "1–6 months" },
        { value: "6-12m", label: "6–12 months" },
        { value: "1-3y", label: "1–3 years" },
        { value: "3y+", label: "More than 3 years" }
      ]
    },
    {
      id: "dates_count",
      section: "history",
      type: "single",
      audience: "history",
      title: "How many physical dates from dating apps have you actually been on?",
      required: true,
      options: [
        { value: "0", label: "None — it never got that far" },
        { value: "1-3", label: "1–3" },
        { value: "4-10", label: "4–10" },
        { value: "10+", label: "More than 10" }
      ]
    },
    {
      id: "faith_visibility",
      section: "history",
      type: "single",
      audience: "history",
      title: "When using dating apps, how openly do you present your faith on your profile?",
      required: true,
      options: [
        { value: "clearly", label: "I state it clearly on my profile" },
        { value: "if-asked", label: "I mention it when it comes up in conversation" },
        { value: "private", label: "I keep it private until I know someone better" },
        { value: "hid", label: "I have downplayed or hidden it to get more matches" },
        { value: "na", label: "Not applicable" }
      ]
    },

    /* ---------------- Section 3: barriers ---------------- */
    {
      id: "barriers",
      section: "barriers",
      type: "multi",
      audience: "barriers",
      title: "What are the main reasons you do not use dating apps, or stopped using them?",
      help: "Select all that apply.",
      required: true,
      allowOther: true,
      otherLabel: "Please describe",
      options: barrierOptions
    },
    {
      id: "barrier_top",
      section: "barriers",
      type: "single",
      audience: "barriers",
      title: "Of the reasons you selected, which one is the biggest deal-breaker for you?",
      required: true,
      allowOther: true,
      otherLabel: "Please describe",
      options: barrierOptions
    },
    {
      id: "experiences",
      section: "barriers",
      type: "multi",
      audience: "barriers",
      title: "Have you ever experienced or witnessed any of the following on dating apps?",
      help: "Select all that apply. This stays anonymous.",
      required: true,
      allowOther: true,
      otherLabel: "Something else",
      options: [
        { value: "fake", label: "A fake profile or 419 scam attempt" },
        { value: "harassment", label: "Harassment or abusive messages" },
        { value: "ghosting", label: "Being ghosted after good conversations" },
        { value: "misrepresented", label: "Someone misrepresenting themselves (photos, age, intentions, or wealth)" },
        { value: "unsafe", label: "Feeling unsafe or uncomfortable on a date" },
        { value: "pressure", label: "Being pressured for sex or to compromise my values" },
        { value: "faith-mocked", label: "Being mocked or looked down on for my faith" },
        { value: "married", label: "Discovering a match was married or in a relationship" },
        { value: "none", label: "None of these", exclusive: true },
        { value: "private", label: "Prefer not to say", exclusive: true }
      ]
    },
    {
      id: "frustration",
      section: "barriers",
      type: "open",
      audience: "barriers",
      title: "In your own words, what is your single biggest frustration or fear about dating apps?",
      help: "A sentence or two is plenty. This is optional.",
      required: false,
      placeholder: "For example: everyone seems to be on there for the wrong reasons, and real connections are rare…",
      maxLength: 1500
    },
    {
      id: "rigged",
      section: "barriers",
      type: "scale",
      audience: "barriers",
      title:
        "How much do you agree: \u201CDating apps are designed to keep you hooked and swiping rather than actually help you find a partner.\u201D",
      required: true,
      scale: {
        min: 1,
        max: 5,
        minLabel: "Strongly disagree",
        maxLabel: "Strongly agree"
      }
    },

    /* ---------------- Section 4: motivators ---------------- */
    {
      id: "motivators",
      section: "motivators",
      type: "multi",
      title: "Which of these would make you more likely to try, or return to, a dating app?",
      help: "Select all that apply.",
      required: true,
      allowOther: true,
      otherLabel: "Please describe",
      options: motivatorOptions
    },
    {
      id: "motivator_top",
      section: "motivators",
      type: "single",
      title: "Which one feature matters most to you?",
      required: true,
      allowOther: true,
      otherLabel: "Please describe",
      options: motivatorOptions.concat([
        { value: "several", label: "Several matter equally — I cannot pick just one" }
      ])
    },
    {
      id: "discovery",
      section: "motivators",
      type: "single",
      title: "How would you prefer to discover potential matches?",
      required: true,
      options: [
        { value: "swipe", label: "Swiping through profiles (like Tinder)" },
        { value: "curated", label: "A small number of carefully selected daily matches" },
        { value: "browse", label: "Browsing profiles freely with filters" },
        { value: "activities", label: "Matching through shared interests, fellowships or events" },
        { value: "unsure", label: "Not sure yet" }
      ]
    },
    {
      id: "importance_verified",
      section: "motivators",
      type: "scale",
      group: "importance",
      title: "Verified, genuine profiles",
      required: true,
      scale: { min: 1, max: 5, minLabel: "Not important", maxLabel: "Essential" }
    },
    {
      id: "importance_faith",
      section: "motivators",
      type: "scale",
      group: "importance",
      title: "Faith and values compatibility",
      required: true,
      scale: { min: 1, max: 5, minLabel: "Not important", maxLabel: "Essential" }
    },
    {
      id: "importance_pool",
      section: "motivators",
      type: "scale",
      group: "importance",
      title: "A large number of potential matches in my city",
      required: true,
      scale: { min: 1, max: 5, minLabel: "Not important", maxLabel: "Essential" }
    },
    {
      id: "importance_safety",
      section: "motivators",
      type: "scale",
      group: "importance",
      title: "Safety and privacy controls",
      required: true,
      scale: { min: 1, max: 5, minLabel: "Not important", maxLabel: "Essential" }
    },
    {
      id: "importance_free",
      section: "motivators",
      type: "scale",
      group: "importance",
      title: "Free to use without paywalls",
      required: true,
      scale: { min: 1, max: 5, minLabel: "Not important", maxLabel: "Essential" }
    },
    {
      id: "importance_community",
      section: "motivators",
      type: "scale",
      group: "importance",
      title: "A community I can trust — connected to my church or fellowship",
      required: true,
      scale: { min: 1, max: 5, minLabel: "Not important", maxLabel: "Essential" }
    },
    {
      id: "try_likelihood",
      section: "motivators",
      type: "scale",
      title: "If a new Nigerian Christian dating app solved your biggest frustration, how likely would you be to try it?",
      required: true,
      scale: {
        min: 1,
        max: 5,
        minLabel: "Very unlikely",
        maxLabel: "Very likely"
      }
    },
    {
      id: "disclosure",
      section: "motivators",
      type: "multi",
      title: "Which of these would you be comfortable showing on a dating profile?",
      help: "Select all that apply. This tells us which faith details people want to share.",
      required: true,
      options: [
        { value: "denomination", label: "My church or denomination" },
        { value: "church-name", label: "My specific church name and branch" },
        { value: "attendance", label: "How often I attend church" },
        { value: "boundaries", label: "My stance on physical boundaries and courtship" },
        { value: "statement", label: "A personal statement of faith or doctrinal beliefs" },
        { value: "testimony", label: "My testimony or faith journey" },
        { value: "reference", label: "A pastor or church leader as a character reference" },
        { value: "tribe", label: "My tribe or ethnic background" },
        { value: "none", label: "None of these — I'd rather keep my faith and background private", exclusive: true }
      ]
    },
    {
      id: "denomination_importance",
      section: "motivators",
      type: "single",
      title: "How important is it that a match belongs to the same church or denomination as you?",
      required: true,
      options: [
        { value: "essential", label: "Essential — I would not consider someone from a different denomination" },
        { value: "important", label: "Important, but not a complete deal-breaker" },
        { value: "nice", label: "Nice to have, but not a major factor" },
        { value: "not-important", label: "Not important at all — faith matters more than denomination" },
        { value: "unsure", label: "I have not really thought about it" }
      ]
    },

    /* ---------------- Section 5: pricing and trust ---------------- */
    {
      id: "paid_before",
      section: "pricing",
      type: "single",
      title: "Have you ever paid for a dating app, subscription or in-app purchase?",
      required: true,
      options: [
        { value: "regularly", label: "Yes, regularly" },
        { value: "once-twice", label: "Yes, once or twice" },
        { value: "would-consider", label: "No, but I would consider it if the app was worth it" },
        { value: "never", label: "No, and I would not pay for a dating app" }
      ]
    },
    {
      id: "price_ceiling",
      section: "pricing",
      type: "single",
      title: "What is the most you would pay per month for a dating app that genuinely helped you find a serious partner?",
      required: true,
      options: [
        { value: "0", label: "₦0 — free only" },
        { value: "under-2000", label: "Up to ₦2,000" },
        { value: "2000-5000", label: "₦2,000–₦5,000" },
        { value: "5000-10000", label: "₦5,000–₦10,000" },
        { value: "10000+", label: "More than ₦10,000" },
        { value: "depends", label: "Depends on the features offered" }
      ]
    },
    {
      id: "preferred_model",
      section: "pricing",
      type: "single",
      title: "Which pricing model feels fairest to you?",
      required: true,
      options: [
        { value: "freemium", label: "Free with an optional premium subscription" },
        { value: "one-time", label: "A one-time payment for lifetime access" },
        { value: "pay-per-feature", label: "Pay only for specific extras" },
        { value: "free-ads", label: "Free, supported by advertising" },
        { value: "never-pay", label: "I will not pay for dating apps" },
        { value: "unsure", label: "Not sure" }
      ]
    },
    {
      id: "trust_triggers",
      section: "pricing",
      type: "multi",
      title: "What would make you trust a brand-new dating app enough to create a profile?",
      help: "Select all that apply.",
      required: true,
      allowOther: true,
      otherLabel: "Something else",
      options: [
        { value: "friend", label: "A recommendation from a friend or family member" },
        { value: "success-stories", label: "Seeing real Nigerian success stories and testimonies" },
        { value: "people-on-it", label: "Knowing members of my church are already using it" },
        { value: "pastor-endorsement", label: "A trusted pastor or ministry leader endorsing it" },
        { value: "privacy", label: "A clear, plain-English privacy policy and honest data practices" },
        { value: "verification", label: "Verification of all users (ID or phone number)" },
        { value: "media", label: "Coverage in Nigerian media or Christian publications" },
        { value: "influencer", label: "A recommendation from a Nigerian Christian influencer or content creator" },
        { value: "nothing", label: "Nothing — I would not trust a new app", exclusive: true }
      ]
    },

    /* ---------------- Section 6: open feedback ---------------- */
    {
      id: "redesign",
      section: "open",
      type: "open",
      title: "If you could redesign dating apps from scratch for the Nigerian Christian market, what is the first thing you would change?",
      help: "Optional, but genuinely useful.",
      required: false,
      placeholder: "The first thing I would change is…",
      maxLength: 2000
    },
    {
      id: "ideal",
      section: "open",
      type: "open",
      title: "What would your ideal way of meeting a godly partner online look like?",
      required: false,
      placeholder: "Ideally, I would…",
      maxLength: 2000
    },
    {
      id: "anything_else",
      section: "open",
      type: "open",
      title: "Is there anything else you want to tell us about dating apps or finding a partner in Nigeria today — good or bad?",
      required: false,
      placeholder: "Anything at all…",
      maxLength: 2000
    },

    /* ---------------- Section 7: follow-up ---------------- */
    {
      id: "interview",
      section: "followup",
      type: "single",
      title: "Would you be open to a 20-minute paid follow-up interview (done via voice or video call)?",
      required: true,
      options: [
        { value: "yes", label: "Yes, happy to help" },
        { value: "maybe", label: "Maybe — tell me more first" },
        { value: "no", label: "No thanks" }
      ]
    },
    {
      id: "email",
      section: "followup",
      type: "email",
      title: "Where can we reach you?",
      help: "Only used to arrange the interview. It is stored separately from your answers in exports.",
      required: true,
      visibleIf: { id: "interview", in: ["yes", "maybe"] },
      placeholder: "you@example.com",
      maxLength: 200
    },
    {
      id: "first_name",
      section: "followup",
      type: "open",
      title: "What should we call you?",
      help: "Optional. A first name makes the follow-up warmer.",
      required: false,
      placeholder: "First name",
      maxLength: 60
    },
    {
      id: "waitlist",
      section: "followup",
      type: "single",
      title: "Would you like early access when BEHOLD launches?",
      required: true,
      options: [
        { value: "yes", label: "Yes, add me to the waitlist" },
        { value: "no", label: "No thanks" }
      ]
    }
  ];

  function audienceMatches(question, answers) {
    var status = answers.app_status;
    if (!question.audience || question.audience === "all") return true;
    if (question.audience === "history") {
      return status === "lapsed" || status === "current";
    }
    if (question.audience === "barriers") {
      return status === "never" || status === "lapsed";
    }
    return true;
  }

  function isVisible(question, answers) {
    if (!audienceMatches(question, answers)) return false;
    if (question.visibleIf) {
      var rule = question.visibleIf;
      var value = answers[rule.id];
      if (rule.equals !== undefined) return value === rule.equals;
      if (rule.in) return rule.in.indexOf(value) !== -1;
    }
    return true;
  }

  function visibleQuestions(answers) {
    return questions.filter(function (question) {
      return isVisible(question, answers);
    });
  }

  function sectionById(id) {
    for (var i = 0; i < sections.length; i += 1) {
      if (sections[i].id === id) return sections[i];
    }
    return null;
  }

  function optionsFor(question) {
    var base = question.options || [];
    if (question.allowOther) {
      var hasOther = false;
      for (var i = 0; i < base.length; i += 1) {
        if (base[i].value === "other") hasOther = true;
      }
      if (!hasOther) {
        return base.concat([{ value: "other", label: "Other" }]);
      }
    }
    return base;
  }

  function isAnswered(question, answers) {
    var value = answers[question.id];
    if (question.type === "multi") {
      if (!Array.isArray(value) || value.length === 0) return false;
      if (question.allowOther && value.indexOf("other") !== -1) {
        var other = answers[question.id + "_other"];
        if (typeof other !== "string" || !other.trim()) return false;
      }
      return true;
    }
    if (question.type === "scale") {
      var num = Number(value);
      return Number.isFinite(num) && num >= 1 && num <= 5;
    }
    if (question.type === "single") {
      if (typeof value !== "string" || !value) return false;
      if (question.allowOther && value === "other") {
        var text = answers[question.id + "_other"];
        if (typeof text !== "string" || !text.trim()) return false;
      }
      return true;
    }
    if (question.type === "email") {
      return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
    }
    return typeof value === "string" && value.trim().length > 0;
  }

  function optionLabel(question, value) {
    var options = optionsFor(question);
    for (var i = 0; i < options.length; i += 1) {
      if (options[i].value === value) return options[i].label;
    }
    return value;
  }

  return {
    version: VERSION,
    sections: sections,
    questions: questions,
    sectionById: sectionById,
    visibleQuestions: visibleQuestions,
    isVisible: isVisible,
    isAnswered: isAnswered,
    optionLabel: optionLabel,
    optionsFor: optionsFor,
    barrierOptions: barrierOptions,
    motivatorOptions: motivatorOptions
  };
});
