# HR 360 Feedback Form

## Goal

Create an AppSmith application for running 360 feedback cycles. The application should allow an HR specialist to create feedback requests, define who is being reviewed, assign reviewers, and collect/store all submitted feedback in an external database.

---

## Business Context

The 360 feedback process is used to collect structured performance feedback about an employee from multiple reviewers and optionally from the employee themselves.

The solution should centralize:
- creation of feedback requests by HR
- assignment of review participants
- submission of feedback by assigned reviewers
- storage of all results in an external database
- visibility of request and response statuses

---

## Platform

- **Platform:** AppSmith
- **User source:** external database
- **Results storage:** external database
- **Database schema:** to be provided later

---

## Roles

### HR Specialist
- Creates and manages feedback requests
- HR access is determined by the existing membership app (outside of this Appsmith HR 360 app)

### Reviewer
- Provides feedback for assigned requests

### Reviewed Person
- The employee being reviewed (may provide self-feedback)

---

## Main Functionality

## 1. Feedback Request Management (HR)

HR should be able to create and manage feedback requests with:

- cycle name/title
- reviewed person
- request type (self, peer, manager, etc.)
- list of reviewers
- deadline
- status (draft, active, closed, archived)
- optional notes/instructions
- optional reference link (company values, etc.)

### Behavior
- Users selected from external DB
- Multiple reviewers allowed
- Save as draft or activate
- Editable after creation
- Visible in request list

---

## 2. Assignment Logic

Each request includes:
- 1 reviewed person
- multiple reviewers
- optional self-feedback

### Rules
- All users must come from external DB
- No duplicate reviewer assignments
- HR can see submission status per reviewer
- Reviewers receive a Slack DM notification when they are assigned to a request

---

## 3. Feedback Form

Reviewers complete a structured questionnaire.

### Sections

#### General Info
- title
- instructions
- reviewed person
- reviewer identity/email

#### Text Questions
Examples:
- Key contributions (last 6 months)
- Handling challenges (with examples)
- Contribution to team/company
- Improvement areas
- Quality enablers
- Development goals
- Training recommendations
- Additional comments

#### Rating Questions (1–5 scale)

Scale:
1 – Below Expectations  
2 – Partially Meets Expectations  
3 – Meets expectations (baseline)  
4 – Exceeds expectations  
5 – Significantly exceeds expectations  

Examples:
- Professional skills
- Work quality practices
- Growth mindset
- Cultural alignment

### Requirements
- Required field validation
- Multiline input support
- Clear UI for ratings
- Configurable text labels

---

## 4. External User Integration

App must load users from external DB.

### Usage
- reviewed person selector
- reviewer selector (multi-select)
- searchable list

### Assumptions
Each user has:
- ID
- name
- email

---

## 5. Feedback Storage

All responses must be stored in external DB.

### Data to Store
- request ID
- reviewed person ID
- reviewer ID
- submission timestamp
- answers (text + ratings)
- optional metadata

### Note
Structure should separate:
- requests
- assignments
- responses

---

## 6. Tracking & Progress

HR should see:

- request list
- total reviewers
- completed vs pending
- deadlines
- status

### Per Request
- list of reviewers
- submission status
- submission timestamps

---

## 7. Access Control

### HR
- full access to requests
- assign reviewers
- track progress

### Reviewer
- access assigned forms only
- submit feedback

### Reviewed Person
- submit self-feedback (if assigned)

---

## Suggested Pages

### 1. HR Dashboard
- list of requests
- filters
- create button

### 2. Create/Edit Request
- form with assignments
- save/activate

### 3. Reviewer Tasks
- assigned requests
- deadlines
- open form

### 4. Feedback Form
- questionnaire
- submit

### 5. Request Details
- progress tracking
- reviewer statuses

---

## Functional Requirements

1. HR can create feedback requests
2. Users selected from external DB
3. Multiple reviewers supported
4. Reviewers can submit feedback
5. Validation for required fields
6. Responses stored externally
7. HR can track progress
8. Separation of request/assignment/response layers
9. Reviewers are notified of new assignments via Slack private message

---

## Non-Functional Requirements

- simple and clear UI
- scalable user selection
- reliable validation
- no duplicate submissions (unless allowed)
- maintainable AppSmith structure
- ready for future schema integration

---

## Open Questions

- final DB schema
- authentication method
- reviewer anonymity
- draft submissions
- edit permissions after submission
- email notification requirements (if added later)
- reporting/export needs

---

## Out of Scope (Initial Version)

- analytics dashboards
- anonymous feedback masking
- email notifications
- exports (PDF/Excel)
- form builder
- multi-language support

---

## Acceptance Criteria

### Request Creation
- HR can create and assign reviewers
- request saved and visible

### Reviewer Flow
- reviewer sees assigned tasks only
- can submit feedback
- response stored successfully

### Tracking
- HR sees completion status per reviewer

### Integration
- users loaded from external DB
- responses saved to external DB

---

## Suggested AppSmith Implementation

### Datasources
- external user DB
- external feedback DB

### Queries
- getUsers
- getFeedbackRequests
- createFeedbackRequest
- updateFeedbackRequest
- createAssignments
- getReviewerTasks
- submitFeedbackResponse
- getRequestProgress

### Structure
- separate pages for HR and reviewers
- use AppSmith store for context passing
- keep data layers modular

---

## Short Summary

Build an AppSmith-based HR 360 Feedback application that allows HR to create feedback requests, assign reviewers from an external user database, and collect/store structured feedback responses in an external database with progress tracking.