## CONNECT Platform - Atomic Feature Breakdown v1.1
*Updated to include sole proprietorship support*

### 1. Authentication & Identity (16 atomic features)

#### 1.1 Email Registration
- **What**: User creates account with email/password
- **Stack**: Next.js API route, bcrypt, PostgreSQL, Zod validation

#### 1.2 Email Verification
- **What**: Send verification link, mark email as verified
- **Stack**: Nodemailer, Redis (token storage), PostgreSQL

#### 1.3 Password Reset Flow
- **What**: Request reset link, validate token, update password
- **Stack**: Next.js API, JWT tokens, Redis TTL

#### 1.4 Login with Email
- **What**: Authenticate user, create session
- **Stack**: NextAuth.js, PostgreSQL, Redis sessions

#### 1.5 OAuth Login (Kakao)
- **What**: Login via Kakao account
- **Stack**: NextAuth Kakao provider, OAuth 2.0

#### 1.6 OAuth Login (Naver)
- **What**: Login via Naver account
- **Stack**: NextAuth Naver provider, OAuth 2.0

#### 1.7 Session Management
- **What**: Create, validate, refresh JWT tokens
- **Stack**: jose library, Redis, 7-day refresh tokens

#### 1.8 Organization Creation
- **What**: Create new organization during signup
- **Stack**: PostgreSQL transaction, unique slug generation

#### 1.9 Organization Binding
- **What**: Link user to organization
- **Stack**: PostgreSQL memberships table, foreign keys

#### 1.10 Role Assignment
- **What**: Set user role (Owner/Admin/Member/Viewer)
- **Stack**: PostgreSQL enum, RBAC middleware

#### 1.11 Business Structure Selection
- **What**: Choose between corporate entity and sole proprietorship
- **Stack**: PostgreSQL enum, conditional validation

#### 1.12 Logout
- **What**: Invalidate session, clear cookies
- **Stack**: Redis DEL, cookie deletion

#### 1.13 Remember Me
- **What**: Extended session duration option
- **Stack**: Secure cookie, 30-day TTL

#### 1.14 Multi-device Sessions
- **What**: Track active sessions per user
- **Stack**: Redis sets, device fingerprinting

#### 1.15 Force Logout All
- **What**: Invalidate all user sessions
- **Stack**: Redis pattern deletion, JWT blacklist

#### 1.16 Business Structure Badge Display
- **What**: Show corporate/sole proprietorship status in UI
- **Stack**: React component, conditional styling

### 2. Survey System (28 atomic features)

#### 2.1 Survey Type Detection
- **What**: Determine survey based on org type
- **Stack**: TypeScript discriminated unions

#### 2.2 Business Structure Field
- **What**: Corporate entity vs sole proprietorship selection
- **Stack**: Radio button group, conditional field display

#### 2.3 Dynamic Field Rendering
- **What**: Render form fields based on JSON schema
- **Stack**: React Hook Form, dynamic components

#### 2.4 Conditional Field Display
- **What**: Show/hide fields based on previous answers and business structure
- **Stack**: React state, conditional rendering

#### 2.5 Business Registration Number Input
- **What**: 10-digit for sole proprietorship, 13-digit for corporate
- **Stack**: Input masking, format validation

#### 2.6 Business Registration Verification
- **What**: Real-time validation via Korean business registry API
- **Stack**: API integration, debounced validation

#### 2.7 Personal Guarantee Capacity (Sole Proprietorship)
- **What**: Assess personal guarantee ability
- **Stack**: Range selector, conditional display

#### 2.8 Decision Speed Assessment
- **What**: Measure organizational agility (faster for sole proprietorships)
- **Stack**: Single select, weight calculation

#### 2.9 Accounting Method Selection
- **What**: Simplified vs complex accounting (sole proprietorship specific)
- **Stack**: Radio group, conditional validation

#### 2.10 Field Validation - Required
- **What**: Enforce required field submission with business structure rules
- **Stack**: Zod schema, React Hook Form

#### 2.11 Field Validation - Format
- **What**: Validate email, URL, number formats, business registration format
- **Stack**: Zod regex patterns, custom validators

#### 2.12 Field Validation - Range
- **What**: Check numeric/date ranges, business structure constraints
- **Stack**: Zod min/max, date-fns

#### 2.13 Multi-select Fields
- **What**: Choose multiple options with limits
- **Stack**: React Select, controlled components

#### 2.14 Tag Input Fields
- **What**: Add custom tags with autocomplete
- **Stack**: React Tags Input, Fuse.js search

#### 2.15 File Upload Fields
- **What**: Upload evidence documents
- **Stack**: react-dropzone, S3 presigned URLs

#### 2.16 Auto-save Draft
- **What**: Save form state every 30 seconds
- **Stack**: Debounced API calls, localStorage backup

#### 2.17 Progress Indicator
- **What**: Show completion percentage
- **Stack**: React context, progress calculation

#### 2.18 Section Navigation
- **What**: Jump between survey sections
- **Stack**: React Router, scroll restoration

#### 2.19 Field Help Tooltips
- **What**: Show contextual help on hover, business structure specific
- **Stack**: Floating UI, markdown content

#### 2.20 Input Normalization
- **What**: Standardize org names, cities, business structures in real-time
- **Stack**: API endpoint, normalization dictionary

#### 2.21 Duplicate Detection
- **What**: Warn if organization might exist
- **Stack**: PostgreSQL trigram similarity, threshold

#### 2.22 Save & Exit
- **What**: Save partial progress, resume later
- **Stack**: PostgreSQL JSONB, session storage

#### 2.23 Field Dependencies
- **What**: Calculate derived fields automatically, business structure aware
- **Stack**: React useEffect, computed values

#### 2.24 Validation Summary
- **What**: Show all errors before submission
- **Stack**: Form error aggregation, scroll to error

#### 2.25 Submit Survey
- **What**: Final validation and storage
- **Stack**: PostgreSQL transaction, success redirect

#### 2.26 Edit Submitted Survey
- **What**: Modify after submission with versioning
- **Stack**: PostgreSQL audit trigger, version history

#### 2.27 Survey Language Toggle
- **What**: Switch between Korean/English
- **Stack**: next-intl, locale routing

#### 2.28 Business Structure Specific Templates
- **What**: Load different survey sections based on business structure
- **Stack**: Template switching, conditional rendering

### 3. Matching Engine (22 atomic features)

#### 3.1 Load Candidate Profile
- **What**: Fetch normalized profile data including business structure
- **Stack**: PostgreSQL, Redis cache

#### 3.2 Load Program Catalog
- **What**: Fetch active programs with criteria and business structure eligibility
- **Stack**: PostgreSQL, materialized view

#### 3.3 Apply Hard Gates
- **What**: Binary eligibility filtering including business structure
- **Stack**: JavaScript filter functions

#### 3.4 Business Structure Gate Check
- **What**: Verify business structure eligibility for programs
- **Stack**: Set membership check, eligibility rules

#### 3.5 TRL Gate Check
- **What**: Verify technology readiness level
- **Stack**: Range comparison logic

#### 3.6 Organization Type Gate
- **What**: Check if org type is eligible
- **Stack**: Set membership check

#### 3.7 Co-funding Gate
- **What**: Verify minimum co-funding ratio, adjusted for business structure
- **Stack**: Percentage calculation, structure-specific thresholds

#### 3.8 Evidence Gate
- **What**: Require evidence for TRL ≥7
- **Stack**: Conditional validation

#### 3.9 Personal Guarantee Gate (Sole Proprietorship)
- **What**: Verify personal guarantee capacity meets program requirements
- **Stack**: Range validation, threshold checking

#### 3.10 Calculate Weight Scores
- **What**: Apply 0-1 weights to signals with business structure adjustments
- **Stack**: NumPy-like calculations in JS

#### 3.11 Business Structure Weight Adjustment
- **What**: Apply bonuses/penalties based on business structure benefits
- **Stack**: Conditional weight modification

#### 3.12 Signal Normalization
- **What**: Convert signals to 0-1 scale
- **Stack**: Min-max scaling, z-score

#### 3.13 Weighted Sum Aggregation
- **What**: Combine weighted scores
- **Stack**: Array reduce, floating point

#### 3.14 Apply Penalties
- **What**: Reduce scores for missing items, business structure specific
- **Stack**: Multiplication factors

#### 3.15 Sort by Score
- **What**: Order matches by final score
- **Stack**: Array sort, stable sorting

#### 3.16 Select Top 3
- **What**: Return highest scoring matches
- **Stack**: Array slice, threshold check

#### 3.17 Identify Near-miss
- **What**: Find items within ±1 band
- **Stack**: Distance calculation, boundary check

#### 3.18 Near-miss Coaching
- **What**: Generate improvement suggestions, business structure specific
- **Stack**: Template strings, gap analysis

#### 3.19 Business Structure Conversion Suggestions
- **What**: Suggest corporate conversion when beneficial
- **Stack**: Decision tree, threshold analysis

#### 3.20 Cache Match Results
- **What**: Store results for 30 minutes
- **Stack**: Redis SETEX, JSON stringify

#### 3.21 Invalidate Cache
- **What**: Clear cache on profile update
- **Stack**: Redis DEL pattern matching

#### 3.22 Batch Matching
- **What**: Process multiple profiles efficiently
- **Stack**: Promise.all, connection pooling

### 4. Explanation System (11 atomic features)

#### 4.1 Load Explanation Template
- **What**: Fetch template by track/language/business structure
- **Stack**: PostgreSQL, template cache

#### 4.2 Extract Variable Values
- **What**: Get values for template placeholders including business structure
- **Stack**: Object destructuring, null coalescing

#### 4.3 Fill Template Variables
- **What**: Replace {var} with actual values
- **Stack**: String replace, template literals

#### 4.4 Format Numbers
- **What**: Localize numbers/percentages
- **Stack**: Intl.NumberFormat

#### 4.5 Generate Gap List
- **What**: List missing requirements, business structure aware
- **Stack**: Array diff, formatting

#### 4.6 Generate Checklist Link
- **What**: Create link to action items, business structure specific
- **Stack**: URL generation, query params

#### 4.7 Business Structure Context
- **What**: Add business structure specific guidance to explanations
- **Stack**: Conditional text insertion

#### 4.8 Corporate Conversion Guidance
- **What**: Suggest when sole proprietorship should consider conversion
- **Stack**: Decision logic, threshold calculation

#### 4.9 Translate Explanation
- **What**: Switch between KR/EN versions
- **Stack**: i18n lookup, fallback

#### 4.10 Render Markdown
- **What**: Convert markdown to HTML
- **Stack**: react-markdown, sanitization

#### 4.11 Business Structure Badge Integration
- **What**: Add visual indicators for business structure in explanations
- **Stack**: React components, conditional styling

### 5. Search & Discovery (12 atomic features)

#### 5.1 Full-text Search
- **What**: Search programs/organizations
- **Stack**: PostgreSQL ts_vector, GIN index

#### 5.2 Search Suggestions
- **What**: Autocomplete as user types
- **Stack**: PostgreSQL trigram, LIKE operator

#### 5.3 Filter by Track
- **What**: Show only Funding/Collab/TT/Investor
- **Stack**: SQL WHERE clause, index

#### 5.4 Filter by Business Structure
- **What**: Filter by corporate entity/sole proprietorship
- **Stack**: SQL WHERE clause, index

#### 5.5 Filter by Date Range
- **What**: Programs within deadline window
- **Stack**: Date comparison, B-tree index

#### 5.6 Filter by Region
- **What**: Metro/non-metro filtering
- **Stack**: PostGIS, spatial index

#### 5.7 Sort Results
- **What**: Order by relevance/date/name
- **Stack**: ORDER BY, composite index

#### 5.8 Pagination
- **What**: Load 20 results at a time
- **Stack**: LIMIT/OFFSET, cursor pagination

#### 5.9 Save Search
- **What**: Store search criteria for reuse
- **Stack**: PostgreSQL, user_searches table

#### 5.10 Search History
- **What**: Track recent searches
- **Stack**: Redis list, TTL expiry

#### 5.11 Export Search Results
- **What**: Download as CSV/PDF
- **Stack**: PapaParse, jsPDF

#### 5.12 Business Structure Faceted Search
- **What**: Show counts by business structure in search results
- **Stack**: Elasticsearch aggregations, facet counting

### 6. Workspace Management (15 atomic features)

#### 6.1 Create Workspace
- **What**: Initialize project container with business structure context
- **Stack**: PostgreSQL, UUID generation

#### 6.2 Create Project
- **What**: Link program to workspace
- **Stack**: PostgreSQL foreign key

#### 6.3 Generate Checklist
- **What**: Create tasks from template, business structure specific
- **Stack**: Template engine, bulk insert

#### 6.4 Business Structure Specific Templates
- **What**: Load simplified templates for sole proprietorships
- **Stack**: Template switching, conditional logic

#### 6.5 Assign Task Owner
- **What**: Set responsible person
- **Stack**: User picker, PostgreSQL update

#### 6.6 Set Due Date
- **What**: Calculate deadline minus lead time, adjusted for business structure
- **Stack**: date-fns, business days calculation

#### 6.7 Update Task Status
- **What**: Mark as todo/in-progress/done
- **Stack**: State machine, audit log

#### 6.8 Add Task Comment
- **What**: Discussion thread on tasks
- **Stack**: PostgreSQL, @mentions parsing

#### 6.9 Upload Task Attachment
- **What**: Attach documents to tasks
- **Stack**: S3 multipart upload, virus scan

#### 6.10 Task Notifications
- **What**: Alert on assignment/due date
- **Stack**: Bull queue, email/push

#### 6.11 Progress Dashboard
- **What**: Visual progress tracking
- **Stack**: Recharts, percentage calc

#### 6.12 Export Workspace
- **What**: Download all project data
- **Stack**: ZIP generation, async job

#### 6.13 Archive Project
- **What**: Soft delete completed projects
- **Stack**: PostgreSQL soft delete pattern

#### 6.14 Simplified Documentation Generator
- **What**: Generate streamlined docs for sole proprietorships
- **Stack**: Document template engine, reduced complexity

#### 6.15 Business Structure Compatibility Check
- **What**: Verify document requirements match business structure
- **Stack**: Validation rules, compatibility matrix

### 7. Introduction System (11 atomic features)

#### 7.1 Request Introduction
- **What**: Initiate intro to investor/partner with business structure context
- **Stack**: State machine initialization

#### 7.2 Validate Intro Quota
- **What**: Check monthly limit (5/seat)
- **Stack**: Redis counter, quota check

#### 7.3 Business Structure Context
- **What**: Include business structure info in intro requests
- **Stack**: Context enrichment, template variables

#### 7.4 Send Intro Notification
- **What**: Email to target entity with business structure details
- **Stack**: SendGrid template, tracking pixel

#### 7.5 Track Email Open
- **What**: Record when intro email opened
- **Stack**: Tracking pixel, webhook

#### 7.6 Update Intro State
- **What**: Move through state machine
- **Stack**: PostgreSQL enum, transition rules

#### 7.7 Accept Introduction
- **What**: Target agrees to connect
- **Stack**: Signed URL, state update

#### 7.8 Decline Introduction
- **What**: Target declines with reason
- **Stack**: Reason codes, feedback form

#### 7.9 SLA Timer
- **What**: Track 72-hour response time
- **Stack**: PostgreSQL timestamp, cron job

#### 7.10 Introduction Expiry
- **What**: Auto-decline after 14 days
- **Stack**: Scheduled job, state cleanup

#### 7.11 Business Structure Matching
- **What**: Flag compatibility issues between business structures
- **Stack**: Compatibility rules, warning system

### 8. Billing & Payment (18 atomic features)

#### 8.1 Display Pricing Plans
- **What**: Show Free/Pro options with business structure considerations
- **Stack**: React components, Stripe Pricing API

#### 8.2 Plan Comparison
- **What**: Feature matrix display
- **Stack**: Table component, feature flags

#### 8.3 Business Structure Pricing
- **What**: Different pricing for corporate vs sole proprietorship
- **Stack**: Conditional pricing logic

#### 8.4 Select Payment Method
- **What**: Card/bank transfer option
- **Stack**: Stripe Elements, Toss Payments SDK

#### 8.5 Process Card Payment
- **What**: Charge credit card
- **Stack**: Stripe PaymentIntent API

#### 8.6 Process Bank Transfer
- **What**: Generate virtual account
- **Stack**: Toss Virtual Account API

#### 8.7 Sole Proprietorship Payment Options
- **What**: Personal account friendly payment methods
- **Stack**: Alternative payment providers

#### 8.8 Apply Promo Code
- **What**: Discount calculation
- **Stack**: PostgreSQL promo_codes, validation

#### 8.9 Calculate Tax
- **What**: Add 10% VAT, business structure appropriate
- **Stack**: Tax calculation service

#### 8.10 Generate Invoice
- **What**: Create tax invoice PDF, business structure specific
- **Stack**: React PDF, invoice numbering

#### 8.11 Subscription Creation
- **What**: Start recurring billing
- **Stack**: Stripe Subscription API

#### 8.12 Payment Webhook
- **What**: Handle payment events
- **Stack**: Stripe webhook, signature validation

#### 8.13 Payment Retry
- **What**: Retry failed payments
- **Stack**: Exponential backoff, dunning

#### 8.14 Cancel Subscription
- **What**: Stop future charges
- **Stack**: Stripe cancel API, proration

#### 8.15 Refund Processing
- **What**: Handle refund requests
- **Stack**: Stripe Refund API, audit log

#### 8.16 Seat Management
- **What**: Add/remove user seats
- **Stack**: PostgreSQL, subscription update

#### 8.17 Usage Billing
- **What**: Track metered usage
- **Stack**: Stripe Usage Records API

#### 8.18 Business Structure Invoice Format
- **What**: Generate appropriate invoice format for business structure
- **Stack**: Template engine, legal compliance

### 9. Metering & Limits (13 atomic features)

#### 9.1 Track Search Count
- **What**: Count searches per user/month
- **Stack**: Redis INCR, monthly key

#### 9.2 Track Detail Unlocks
- **What**: Count full match views
- **Stack**: Redis INCR, organization scope

#### 9.3 Track Exports
- **What**: Count CSV/PDF exports
- **Stack**: Redis counter, rate limiting

#### 9.4 Check Feature Access
- **What**: Verify plan allows feature, business structure aware
- **Stack**: Plan configuration, middleware

#### 9.5 Business Structure Specific Limits
- **What**: Different limits for corporate vs sole proprietorship
- **Stack**: Conditional limit checking

#### 9.6 Block Over Limit
- **What**: Prevent action when quota exceeded
- **Stack**: Throw error, show upgrade modal

#### 9.7 Show Usage Dashboard
- **What**: Display current usage vs limits
- **Stack**: React dashboard, Redis MGET

#### 9.8 Reset Monthly Counters
- **What**: Clear counters on billing cycle
- **Stack**: Cron job, Redis DEL pattern

#### 9.9 Trial Activation
- **What**: Start 7-day Pro trial
- **Stack**: PostgreSQL trial record

#### 9.10 Trial Expiry
- **What**: Revert to Free after trial
- **Stack**: Scheduled job, plan downgrade

#### 9.11 Upgrade Prompt
- **What**: Show upgrade modal at limits, business structure specific
- **Stack**: React modal, conversion tracking

#### 9.12 Feature Override
- **What**: Admin bypass for VIP users
- **Stack**: PostgreSQL overrides table

#### 9.13 Business Structure Usage Analytics
- **What**: Track usage patterns by business structure
- **Stack**: Analytics pipeline, reporting

### 10. Admin & Analytics (15 atomic features)

#### 10.1 Admin Authentication
- **What**: Separate admin login
- **Stack**: NextAuth admin provider

#### 10.2 Program CRUD
- **What**: Create/edit funding programs with business structure eligibility
- **Stack**: React Admin, PostgreSQL

#### 10.3 User Management
- **What**: View/edit/ban users with business structure context
- **Stack**: DataGrid, soft delete

#### 10.4 Business Structure Analytics
- **What**: Monitor distribution and success rates by business structure
- **Stack**: PostgreSQL analytics queries

#### 10.5 System Metrics
- **What**: CPU/memory/network graphs
- **Stack**: Prometheus, Grafana

#### 10.6 Business KPIs
- **What**: Revenue, conversion, churn by business structure
- **Stack**: PostgreSQL analytics queries

#### 10.7 Fairness Monitoring
- **What**: SME vs Large, Corporate vs Sole Proprietorship gap tracking
- **Stack**: SQL aggregation, alerts

#### 10.8 Error Tracking
- **What**: Monitor application errors
- **Stack**: Sentry integration

#### 10.9 Audit Logs
- **What**: Track all admin actions
- **Stack**: PostgreSQL audit trigger

#### 10.10 Feature Flags
- **What**: Toggle features without deploy, business structure specific
- **Stack**: LaunchDarkly SDK or Redis

#### 10.11 A/B Testing
- **What**: Test variants for conversion by business structure
- **Stack**: GrowthBook, statistical analysis

#### 10.12 Export Analytics
- **What**: Download reports as Excel
- **Stack**: ExcelJS, background job

#### 10.13 Email Broadcasts
- **What**: Send announcements to users, segmented by business structure
- **Stack**: SendGrid broadcast API

#### 10.14 Business Structure Conversion Tracking
- **What**: Monitor sole proprietorship → corporate conversion rates
- **Stack**: Event tracking, funnel analysis

#### 10.15 Regulatory Compliance Dashboard
- **What**: Monitor compliance requirements by business structure
- **Stack**: Compliance tracking, alert system

### 11. Business Structure Support Services (12 atomic features)

#### 11.1 Corporate Conversion Assessment
- **What**: Evaluate when sole proprietorship should convert
- **Stack**: Decision tree algorithm

#### 11.2 Conversion Timeline Generator
- **What**: Create step-by-step conversion plan
- **Stack**: Template engine, milestone tracking

#### 11.3 Personal Guarantee Calculator
- **What**: Assess personal guarantee capacity
- **Stack**: Financial calculation engine

#### 11.4 Simplified Document Templates
- **What**: Generate streamlined docs for sole proprietorships
- **Stack**: Document generation engine

#### 11.5 Business Structure Compatibility Checker
- **What**: Check investor/program compatibility
- **Stack**: Rule engine, compatibility matrix

#### 11.6 Liability Assessment Tool
- **What**: Evaluate personal liability risks
- **Stack**: Risk calculation algorithm

#### 11.7 Tax Implication Calculator
- **What**: Show tax differences between business structures
- **Stack**: Tax calculation service

#### 11.8 Registration Assistance
- **What**: Guide through business registration process
- **Stack**: Step-by-step wizard

#### 11.9 Legal Form Generator
- **What**: Create appropriate legal forms by business structure
- **Stack**: Form generation engine

#### 11.10 Compliance Checker
- **What**: Verify regulatory compliance by business structure
- **Stack**: Compliance rule engine

#### 11.11 Financial Health Score
- **What**: Assess financial stability for funding eligibility
- **Stack**: Scoring algorithm

#### 11.12 Business Structure Migration Tool
- **What**: Help convert between business structures
- **Stack**: Migration wizard, document transfer

This enhanced breakdown provides 156 atomic features that can be implemented independently, tested in isolation, and deployed incrementally, with comprehensive support for both corporate entities and sole proprietorships throughout the platform.