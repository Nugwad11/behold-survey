# BEHOLD — Website Build Brief

Purpose: Adapt the PatioTime Demo 9 website structure into an original, premium BEHOLD dating-platform website. Recreate its layout rhythm and conversion strategy, not its restaurant content, imagery, branding or exact copy.

## Product context
- Brand: BEHOLD
- Tagline: Where Connections Become Stories.
- Positioning: a thoughtful, faith-aware dating experience for adults seeking intentional, values-aligned relationships and meaningful connection.
- Audience: adults 18+ interested in Christian/faith-aware dating. Do not assume all users share one denomination or identical beliefs.
- Voice: warm, sincere, emotionally intelligent, welcoming, modern and premium.
- Primary CTA: Join BEHOLD. Secondary CTA: Discover How It Works.
- Be truthful about current functionality. Do not describe planned features as live features.

## Design reference and page structure
Reference: https://patiotime.loftocean.com/demo9/
Use the reference's composition: slim utility bar; clear navigation; cinematic image-led hero; brand-story section; three feature/value cards; large editorial experience section; practical information; strong final CTA; multi-column footer.
Translate the restaurant reservation pattern into account creation or an early-access/waitlist CTA. Do not reuse restaurant menus, booking forms, addresses, telephone numbers, wine content or restaurant copy.

## Visual identity
- Direction: romantic, elegant, intimate, editorial, premium and contemporary; not a generic dating-app template.
- Carry forward the chosen warm romantic direction: pink, deep red, charcoal and soft neutrals.
- Suggested editable tokens: charcoal #211B20; burgundy #6E233F; rose #B85C78; blush #F6E8EC; warm ivory #FFF9F5; muted gold #C5A16A; body text #51464B.
- Pair refined serif display typography with clean sans-serif UI/body typography.
- Use generous whitespace, strong hierarchy, subtle borders, restrained shadows and tasteful motion.
- Use authentic, diverse adult relationship/lifestyle photography. Prioritise the user's supplied traditional wedding photographs as signature imagery if present in the repository. Inspect assets; never invent file paths. If assets are absent, use replaceable placeholders and document recommended dimensions.
- Hero: full-bleed landscape photograph, responsive focal crop and charcoal/burgundy gradient overlay for readable text.
- Avoid excessive hearts, emoji, visual clutter, overused gradients and generic stock-template styling.

## Home page
1. Announcement/utility strip with concise launch or trust information.
2. Navigation: BEHOLD logo; Home; About; How It Works; Features; Safety; FAQ; Sign In only if authentication exists; prominent Join BEHOLD CTA.
3. Cinematic hero: eyebrow CONNECTION • FAITH • PURPOSE; headline Meaningful Connections Begin Here; concise description; Join BEHOLD and Discover How It Works CTAs.
4. Brand story: heading More Than a Match. A Meaningful Beginning. Explain the need for intentional, values-aware dating.
5. Three principles/cards: Faith, Intention, Connection. Feature headings: Show Up as You Are; Connect with Intention; Lead with Respect.
6. How it works: create a profile; express what matters; discover compatible people; begin a respectful conversation. Match this to actual implemented functionality.
7. Editorial feature section with a large romantic image and copy about meaningful connection.
8. Safety and trust section covering respectful conduct, privacy principles, age requirement and support pathways.
9. FAQ preview.
10. Final CTA: Your Next Meaningful Story Could Begin Here.
11. Footer with product navigation, company links, contact/support, privacy, terms and social links.

Suggested hero copy: “Meet people who value more than a passing moment. BEHOLD is being shaped for intentional connections, shared values, and relationships that begin with honesty.”
Suggested purpose copy: “The best connections begin when people can show up as themselves. BEHOLD is built around the belief that shared values, honest conversations, and clear intentions deserve a better place to begin.”

## Required pages
- Home: story, value proposition, how it works, feature highlights, trust, FAQ preview and CTA.
- About: purpose, mission, values, founding story placeholder. Do not invent founder biographies, dates, partnerships or impact statistics.
- How It Works: explain onboarding, profile setup, preferences, discovery, matching and messaging only where these functions exist. Label intended future journeys clearly.
- Features: group product features and label each Available Now, In Development or Planned based on verified code.
- Safety & Trust: age 18+, respectful conduct, privacy, report/block pathways and community guidelines. Do not claim verification, moderation, encryption or reporting controls are active unless implemented.
- FAQ: eligibility, faith and values, profiles, discovery, privacy, reporting, account deletion, pricing if known, and support.
- Contact/Support: accessible form with name, email, subject and message. Validate inputs and provide success/error states. Do not invent a support email address.
- Join/Sign up: connect to real authentication if it exists. Otherwise provide an honest early-access/waitlist form with consent, minimal data collection, server-side validation and spam protection.

## Interaction and conversion
- Repeat Join BEHOLD in the hero, after How It Works and in the footer.
- Every button and link must work. Never leave dead CTAs.
- If no account system exists, route to a clearly labelled waitlist instead of faking registration.
- Mobile navigation must be keyboard accessible, close after selection and keep the main CTA easy to reach.
- Forms need validation, loading, success and error states.

## Engineering requirements
- First inspect the full repository: framework, routes, components, assets, styles, authentication, data model and deployment configuration.
- Reuse the existing stack and conventions. Do not migrate frameworks without a clear reason.
- Fully responsive on mobile, tablet, laptop and wide desktop.
- Semantic HTML, keyboard support, visible focus, labelled forms, sufficient contrast, meaningful alt text and reduced-motion support.
- Optimise images; lazy-load below-the-fold imagery and prioritise the hero asset.
- Build reusable navigation, hero, feature cards, CTA bands, FAQ, forms and footer components.
- Add page titles, meta descriptions, Open Graph metadata, favicon and configurable canonical URL.
- Make analytics consent-aware and configurable; do not hardcode tracking IDs.
- Keep secrets and API credentials out of client-side code.
- Keep content, colours, image references, navigation and CTA destinations easy to edit.

## Repository-specific instruction
The connected repository is Nugwad11/behold-survey. Its README describes a Christian dating user-research survey, not the production dating application; it explicitly says native dating features are out of scope. Preserve the survey, its routes, API, dashboard and data. Do not overwrite or repurpose it as the dating product. Inspect the repository and identify whether a separate production-app repository or website code exists before implementation.

## Implementation sequence for the coding AI
1. Audit repository structure, existing functionality, assets and framework.
2. Identify the supplied wedding photographs and reuse suitable assets.
3. Build the responsive public marketing site using the reference's section composition and BEHOLD's original identity.
4. Connect CTAs and forms to real routes. Use a waitlist if authentication is not yet available.
5. Clearly distinguish live functionality from roadmap features.
6. Preserve the research survey and test it for regressions.
7. Test mobile navigation, every link and CTA, form validation, accessibility, responsive layouts, performance and SEO.
8. Update the README with routes, setup, environment variables, image replacement and deployment instructions.

## Acceptance criteria
- Looks unmistakably like BEHOLD, not a restaurant site or generic dating theme.
- Follows the reference rhythm: image-led hero → brand story → feature highlights → experience section → trust information → CTA → footer.
- Uses the warm romantic palette consistently.
- Reuses the supplied wedding imagery where available without distortion.
- All links, buttons, forms and mobile navigation work.
- No fabricated testimonials, user counts, ratings, verification claims, pricing, founder details or unsupported features.
- Responsive, accessible, performant and SEO-ready.
- Existing survey application remains fully functional.