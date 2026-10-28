#!/bin/bash
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT/journey"
npm ci
npm run package
cp deliverables/journey-walkthrough.html "$PROJECT_ROOT/ios/JourneyApp/Resources/journey.html"

cp "$PROJECT_ROOT/backend/project.json" "$PROJECT_ROOT/ios/JourneyApp/Resources/supabase.json"
