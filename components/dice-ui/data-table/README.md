# Dice UI Data Table Primitive

This directory contains the Dice UI data table primitive code used by the app.

Treat these files like vendored primitive components:

- Do not edit files in this directory for feature-specific behavior.
- Put app-specific table composition in the feature component that uses it.
- Keep domain logic, queries, and server actions outside this directory.
- If the primitive itself needs to change, keep the change generic and reusable.

For Yoshiya-specific table behavior, prefer composing these exports from feature
folders such as `components/kitchen/*`.
