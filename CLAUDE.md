Gala Dinner Registration & Event Platform — Requirements Context
1. Registration System (Multi-Step Wizard)
Registration must be a step-by-step process (wizard), with each step revealing information and collecting data gradually.
Step 1: Show event details (price, location, time, what’s included, rules, opening/closing dates).
Step 2: Collect personal data:
Name and email auto-filled from Authentik (OIDC).
Student number (manual input).
Year (dropdown: 1,2,3,4,5, alumni).
Step 3: Logistics:
Ask if user wants bus (round trip, one way, or none).
Show available meal options (admin-configurable).
Collect food allergies (mandatory or optional, always visible in meal selection).
Step 4: Payment:
Show payment info, deadline, and phased payment option.
Allow upload of payment proof. Use R2 storage
Step 5: Table selection/management (see below).
Step 6: Final confirmation.
Progress must be saved between steps.
Input validation at every step.
2. Table Management System (Redesign)
Users interact with tables only after completing registration.
Users can:
Create a table (set name, upload optional photo).
Join an existing table.
Remain without a table (optional).
Invite friends to their table (via email or link).
Leave or change tables before registration closes.
Table status (available seats, members) must be visible.
Admin can manage all tables and members.
3. Admin Dynamic Configuration
Admin can configure all event parameters:
Texts, dates, meal options, prices, limits, rules, etc.
All configuration is dynamic (no code changes required).
Admin can open/close registration, set limits, edit info.
Data export tools for registrations, tables, payments.
Changes are reflected instantly in the frontend.
4. Voting System (Improvements)
Responsive UI, clear feedback (loading, errors, success).
Show voting state (open, closed, already voted).
Admin can open/close voting per category.
Results only visible after admin approval (per category).
One vote per user per category.
5. Nomination System (Improvements)
Free text input for nominee per category.
Suggest similar names (fuzzy search).
Admin can merge similar names.
Top 4 nominees per category advance to voting.
User can only nominate once per category.
6. Limits, Rules, and Security
Enforce all limits (registrations, tables, bus seats, etc.).
Validate all dates (open/close) for every action.
Restrict file uploads (type, size) for payment proofs and table photos.
Strict role-based access for admin endpoints.
Backend validation for all user inputs.
7. Documentation & API
All endpoints, flows, and admin features must be documented.
API documentation (OpenAPI/Swagger or similar).
User flow diagrams for registration, table management, voting, and nominations.
Admin guide for configuration and event management.
