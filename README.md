Intelligence Query Engine API (Stage 2)
// Overview

This project is a backend API built with Next.js (App Router) and MongoDB that provides demographic intelligence data.

It allows users to:

Store demographic profiles
Filter, sort, and paginate results
Query data using natural language
// Features
// Advanced Filtering

Supports:

gender
age_group
country_id
min_age / max_age
min_gender_probability
min_country_probability

All filters are combinable (AND logic).

// Sorting

Supported fields:

age
created_at
gender_probability

Order:

asc
desc
// Pagination
page (default: 1)
limit (default: 10, max: 50)

Uses MongoDB skip and limit.

// Natural Language Search

Endpoint:

GET /api/profiles/search?q=<query>
//Parsing Approach

The system uses a rule-based parser (no AI/LLM).

Supported Keywords
Keyword	Meaning
male	gender = male
female	gender = female
young	age 16–24
above X	age >= X
adult	age_group = adult
teenager	age_group = teenager
nigeria	country_id = NG
kenya	country_id = KE
angola	country_id = AO
//Examples
Query	Output
young males	gender=male, age 16–24
females above 30	gender=female, age ≥ 30
adult males from nigeria	gender=male, age_group=adult, country=NG
// Limitations
Cannot parse complex sentences
Limited country mapping
No synonym support
Cannot handle multiple age ranges
"young" is not stored in DB
Data Model

Each profile contains:

id (UUID v7)
name (unique)
gender
gender_probability
age
age_group
country_id
country_name
country_probability
created_at
 Performance Optimization

Indexes used:

ProfileSchema.index({ gender: 1 });
ProfileSchema.index({ age: 1 });
ProfileSchema.index({ country_id: 1 });
Why?

Indexes improve query speed by avoiding full collection scans.

 API Endpoints
GET /api/profiles

Supports:

filtering
sorting
pagination
GET /api/profiles/search

Natural language query endpoint.

POST /api/profiles

Creates a profile using external APIs.
 Data Seeding

A dataset of profiles is seeded into the database using a script:

node script.js

The script uses upsert to prevent duplicates.

🛠️ Setup
npm install
npm run dev
Notes
All timestamps are in UTC (ISO 8601)
CORS is enabled
Query validation is enforced