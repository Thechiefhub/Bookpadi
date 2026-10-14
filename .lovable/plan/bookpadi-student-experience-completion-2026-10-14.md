# Bookpadi student experience completion

## What will change
- Refresh the public homepage and dashboard with a bold cobalt, electric-lime, and coral direction; feature the existing study tools and student imagery.
- Add school-limited student discovery and direct messaging, with access enforced in the database and a Messages entry in app navigation.
- Add unique usernames to signup, show availability feedback, and save usernames on profiles; protect against duplicate signups even if requests race.
- Close the small remaining plain-text-maths gap in timetable generation and verify the previously completed course-upload and course-planning flows.

## Technical approach
- Use the existing React, Tailwind, and Lovable Cloud patterns. Add an additive migration for nullable profile usernames, a normalized unique index, safe username-check and school-scoped search functions, and RLS-protected direct messages. Existing accounts remain valid without a username.
- Keep the existing institution field as the school boundary; users can only discover or message users who share their institution.
- Add a dedicated messaging page and route; retain current auth and navigation conventions. Use the existing image asset and semantic theme tokens for the homepage/dashboard visual refresh.
