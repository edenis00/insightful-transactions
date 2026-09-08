# Insightful Transactions

Absolutely. I would make it detailed enough to function as the master technical specification for both Lovable and Copilot, while keeping it consistent with the system you have already documented in Chapter Three.

I will structure it so that Lovable can use the frontend sections directly, while Copilot can use the backend, database, fraud rules, and API sections without having to guess the intended behaviour.

TECHNICAL REQUIREMENTS DOCUMENT (TRD)

Web-Based Credit Card Fraud Detection and Transaction Analysis System

1. Project Overview

The proposed system will be a web-based credit card fraud detection and transaction analysis application. The system will be developed to record credit card transactions, monitor transaction activities, apply predefined fraud detection rules, generate alerts for suspicious transactions, maintain transaction history, and provide analytical information through dashboards and reports.

The system will consist of a React frontend, a Python backend, and a MySQL relational database.

The React frontend will provide the user interface through which authorised users will interact with the system. The Python backend will provide the application logic, transaction processing, fraud detection, authentication, reporting, and communication with the database. MySQL will be used for persistent storage of users, transactions, fraud alerts, and analytical records.

The system will primarily demonstrate how transaction monitoring and rule-based fraud detection can be integrated into a web application.

2. Project Objectives

The system shall:

Provide secure user authentication.

Record credit card transaction information.

Monitor transactions submitted to the system.

Apply predefined fraud detection rules to transactions.

Identify transactions that satisfy suspicious activity conditions.

Generate fraud alerts for flagged transactions.

Maintain transaction history.

Provide transaction search functionality.

Analyse transaction behaviour.

Present transaction information through dashboard visualisations.

Generate transaction analysis reports.

Provide authorised users with access to fraud alerts and transaction information.

Provide a simple and consistent web interface.

Demonstrate the complete transaction flow from submission to analysis and fraud alert generation.

3. System Scope

The system will cover the following activities:

3.1 Included

User registration

User login

User authentication

Session/token management

Transaction recording

Transaction validation

Transaction monitoring

Rule-based fraud detection

Suspicious transaction identification

Fraud alert generation

Transaction history

Transaction searching

Transaction filtering

Transaction grouping

Transaction analysis

Dashboard visualisation

Report generation

Fraud alert viewing

Basic user account management

Database storage and retrieval

3.2 Excluded

The system will not:

Connect to an actual bank payment gateway.

Process real financial payments.

Debit or credit real bank accounts.

Access real customers' credit card accounts.

Perform live communication with banking networks.

Implement an artificial intelligence or machine learning fraud prediction model.

Automatically contact law enforcement agencies.

Replace an operational banking fraud management platform.

Transactions used during development and demonstration will therefore be simulated or manually entered transaction data.

4. Intended Users

The primary user of the system will be the Administrator/Fraud Analyst.

The administrator will be responsible for:

Logging into the system.

Viewing transaction records.

Monitoring transactions.

Reviewing fraud alerts.

Analysing transaction behaviour.

Searching transactions.

Viewing analytical dashboards.

Generating reports.

Managing registered users where applicable.

If a normal user role is retained in the implementation, the normal user will have restricted access and will only be permitted to perform functions assigned to that role.

5. Technology Stack

ComponentTechnologyFrontendReactFrontend LanguageJavaScriptStylingCSSBackendPythonBackend FrameworkFastAPIAPI StyleREST APIDatabaseMySQLDatabase AccessSQLAlchemy or equivalent Python ORMAuthenticationToken-based authenticationDevelopment EnvironmentVisual Studio CodeVersion ControlGitBrowserChrome, Edge or equivalent modern browserData VisualisationReact-compatible charting libraryTestingAPI and application testing tools

The exact supporting libraries may be selected during implementation, provided that they do not alter the functional requirements defined in this document.

6. High-Level System Architecture

The system shall follow a three-tier architecture consisting of:

┌─────────────────────────────────────────┐
│          PRESENTATION LAYER             │
│              React Frontend             │
│                                         │
│ Dashboard | Transactions | Alerts       │
│ Reports   | Login | Analysis            │
└────────────────────┬────────────────────┘
                     │
                     │ REST API / HTTP
                     ↓
┌─────────────────────────────────────────┐
│          APPLICATION LAYER              │
│             Python / FastAPI            │
│                                         │
│ Authentication                          │
│ Transaction Processing                  │
│ Transaction Monitoring                  │
│ Fraud Detection Rules                   │
│ Alert Management                        │
│ Transaction Analysis                    │
│ Report Generation                       │
└────────────────────┬────────────────────┘
                     │
                     │ Database Queries
                     ↓
┌─────────────────────────────────────────┐
│             DATA LAYER                  │
│                MySQL                    │
│                                         │
│ Users | Transactions | Fraud Alerts     │
│ Reports | Supporting Records            │
└─────────────────────────────────────────┘

Architectural rule

The React frontend shall not contain the core fraud detection logic.

Fraud detection shall be performed by the Python backend.

The frontend shall submit transaction information to the backend and display the result returned by the backend.

7. Core Transaction Processing Workflow

The central workflow shall be:

User Login
    ↓
Transaction Data Entry
    ↓
Frontend Validation
    ↓
Backend Validation
    ↓
Transaction Stored
    ↓
Transaction Monitoring
    ↓
Fraud Detection Rules Applied
    ↓
Suspicious?
   /     \
 Yes      No
 ↓         ↓
Flagged   Normal
 ↓         ↓
Fraud     Normal
Alert     Transaction
 ↓         ↓
    Transaction Database
             ↓
      Transaction Analysis
             ↓
       Dashboard/Reports

This workflow shall form the central business process of the application.

8. Frontend Requirements

8.1 General Frontend Requirements

The React application shall:

Provide a responsive web interface.

Provide consistent navigation.

Communicate with the Python REST API.

Display appropriate loading states.

Display appropriate error messages.

Display empty states where no records exist.

Prevent unauthorised access to protected pages.

Handle expired authentication sessions.

Provide confirmation feedback after successful operations.

Validate user input before submission.

9. Frontend Pages

9.1 Login Page

The login page shall provide:

Email/username field.

Password field.

Login button.

Validation messages.

Authentication error message.

Loading state during authentication.

Successful authentication shall redirect the user to the dashboard.

Invalid authentication credentials shall produce an appropriate error message.

9.2 Registration Page

Where registration is enabled, the page shall provide:

Full name.

Email address.

Password.

Password confirmation.

Registration button.

Input validation shall be performed before the information is submitted to the backend.

10. Dashboard

The dashboard shall provide a summary of the current transaction environment.

The dashboard shall display information such as:

Total transactions.

Normal transactions.

Suspicious transactions.

Number of fraud alerts.

Total transaction value.

Recent transactions.

Recent fraud alerts.

Transaction activity trends.

Charts may be used to display:

Transaction volume over time.

Normal versus suspicious transactions.

Transaction values.

Transaction distribution by type.

Transaction distribution by location.

The dashboard shall obtain its data from backend API endpoints rather than using hard-coded transaction statistics.

11. Transaction Management

The transaction interface shall provide a transaction form for recording transactions.

The form may contain:

Transaction reference.

Card reference.

Transaction amount.

Transaction type.

Transaction location.

Transaction date and time.

Merchant/source information.

Transaction status.

Sensitive card information shall not be stored unnecessarily. A card reference or masked card number shall be preferred for demonstration purposes.

After submission, the transaction shall be sent to the backend.

The backend shall validate and process the transaction before returning its status.

12. Transaction History

The transaction history page shall display recorded transactions in a tabular format.

The table shall support:

Transaction ID.

Transaction reference.

Amount.

Transaction type.

Location.

Date/time.

Status.

Fraud status.

Pagination shall be supported where the number of records becomes large.

13. Transaction Search

The transaction interface shall provide search and filtering capabilities.

Users shall be able to search or filter transactions by:

Transaction reference.

Date.

Transaction type.

Location.

Transaction status.

Fraud status.

Amount range.

Search operations shall be handled through backend API requests where appropriate.

14. Fraud Alerts

The fraud alert page shall display transactions that have triggered fraud detection rules.

Each alert shall contain information such as:

Alert ID.

Transaction ID.

Reason for flagging.

Rule triggered.

Transaction amount.

Transaction date/time.

Location.

Alert status.

The interface may provide alert statuses such as:

New

Under Review

Reviewed

Resolved

The exact statuses shall remain consistent throughout the application.

15. Transaction Analysis

The analysis module shall allow transaction records to be grouped and examined.

Transactions shall be analysed according to:

Transaction amount.

Transaction frequency.

Transaction type.

Location.

Time period.

Transaction status.

Fraud status.

The analysis page shall provide numerical summaries and visual representations of transaction behaviour.

16. Reports

The reporting module shall generate transaction analysis summaries.

Reports may contain:

Reporting period.

Total transactions.

Total transaction value.

Normal transactions.

Suspicious transactions.

Fraud alert count.

Transaction distribution.

Transaction trends.

Reports shall be generated from actual records stored in the database.

17. Backend Requirements

The Python backend shall be responsible for:

Authentication.

Authorisation.

Input validation.

Transaction processing.

Transaction storage.

Transaction monitoring.

Fraud detection.

Fraud alert generation.

Transaction retrieval.

Transaction searching.

Transaction analysis.

Report generation.

Database communication.

18. Backend Module Structure

The backend should be organised into separate modules.

A suggested structure will be:

backend/
│
├── app/
│   ├── main.py
│   │
│   ├── auth/
│   │   ├── routes.py
│   │   ├── schemas.py
│   │   └── service.py
│   │
│   ├── users/
│   │   ├── routes.py
│   │   ├── models.py
│   │   └── service.py
│   │
│   ├── transactions/
│   │   ├── routes.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── service.py
│   │
│   ├── fraud_detection/
│   │   ├── rules.py
│   │   └── service.py
│   │
│   ├── alerts/
│   │   ├── routes.py
│   │   └── service.py
│   │
│   ├── analysis/
│   │   ├── routes.py
│   │   └── service.py
│   │
│   ├── reports/
│   │   ├── routes.py
│   │   └── service.py
│   │
│   └── database/
│       ├── connection.py
│       └── models.py
│
└── requirements.txt

The exact folder structure may be modified during implementation, but separation of responsibilities shall be maintained.

19. Functional Requirements

IDRequirementFR1The system shall provide user authentication.FR2The system shall record credit card transactions.FR3The system shall monitor recorded transactions.FR4The system shall apply predefined fraud detection rules to transactions.FR5The system shall generate fraud alerts for suspicious transactions.FR6The system shall maintain transaction history.FR7The system shall provide transaction search functionality.FR8The system shall generate transaction analysis reports and dashboard visualisations.

20. Non-Functional Requirements

IDRequirementNFR1The system shall provide secure user authentication.NFR2The system shall process transactions with minimal response time under normal operating conditions.NFR3The system shall maintain reliable operation during normal usage.NFR4The system shall provide high availability during normal operation.NFR5The system shall provide a simple, consistent and easy-to-navigate interface.NFR6The system shall support future functional enhancements without major restructuring.NFR7The system shall use modular software components to support maintainability.NFR8The system shall terminate inactive authenticated sessions after the configured timeout period.

21. Authentication and Session Management

Authentication shall be implemented through the Python backend.

The backend shall:

Verify user credentials.

Authenticate users.

Issue authentication tokens.

Protect restricted endpoints.

Verify authentication tokens on protected requests.

Reject expired authentication tokens.

Reject unauthorised requests.

The frontend shall:

Store authentication state securely according to the selected authentication implementation.

Protect restricted routes.

Detect authentication expiration.

Redirect unauthenticated users to the login page.

Session timeout

An inactivity timeout shall be implemented.

For example:

The system shall terminate an inactive session after 30 minutes.

The exact duration may be configured through the backend settings.

22. Fraud Detection Framework

The fraud detection component shall use a rule-based approach.

Each incoming transaction shall be evaluated against predefined conditions.

The processing shall follow:

Transaction
     ↓
Validation
     ↓
Rule Evaluation
     ↓
Rule Violated?
   /       \
 Yes        No
 ↓          ↓
Flag       Normal
 ↓
Generate Alert

23. Proposed Fraud Detection Rules

The initial implementation shall include rules such as:

Rule 1: High Transaction Amount

A transaction shall be flagged when its amount exceeds a predefined threshold.

Example:

IF transaction_amount > configured_threshold
THEN flag transaction

The threshold shall be configurable.

Rule 2: High Transaction Frequency

A transaction shall be flagged when several transactions associated with the same card reference occur within a short configured period.

Example:

IF number_of_transactions > configured_limit
WITHIN configured_time_period
THEN flag transaction

Rule 3: Unusual Location

A transaction shall be flagged where the transaction location differs significantly from the user's established transaction location, subject to the available transaction data.

Rule 4: Multiple Suspicious Conditions

Where a transaction satisfies more than one rule, all triggered rules shall be recorded against the fraud alert.

For example:

Transaction 1024

Rules Triggered:
1. High Transaction Amount
2. High Transaction Frequency

Risk Status:
Suspicious

24. Fraud Alert Processing

When a transaction satisfies a fraud rule:

The transaction shall be marked as suspicious.

A fraud alert shall be created.

The triggered rule shall be recorded.

The alert shall be associated with the transaction.

The alert shall become visible on the fraud alert interface.

The transaction shall remain available for analysis.

Transactions that do not trigger any rule shall be recorded as normal transactions.

25. Database Design

The initial database shall contain the following principal entities:

USERS
   │
   │
   └──────────────┐
                  ↓
             TRANSACTIONS
                  │
                  ↓
             FRAUD_ALERTS
                  
TRANSACTIONS
      │
      ↓
   REPORTS / ANALYSIS

26. Users Table

FieldTypeKeyDescriptionidINTPKUnique user identifierfull_nameVARCHARUser's full nameemailVARCHARUNIQUEUser emailpassword_hashVARCHARHashed passwordroleVARCHARUser rolecreated_atDATETIMEAccount creation timeupdated_atDATETIMELast update time

27. Transactions Table

FieldTypeKeyDescriptionidINTPKTransaction identifiertransaction_referenceVARCHARUNIQUETransaction referenceuser_idINTFKAssociated usercard_referenceVARCHARMasked/reference card identifieramountDECIMALTransaction amounttransaction_typeVARCHARTransaction typelocationVARCHARTransaction locationtransaction_dateDATETIMETransaction date and timestatusVARCHARTransaction processing statusfraud_statusVARCHARNormal or suspiciouscreated_atDATETIMERecord creation time

28. Fraud Alerts Table

FieldTypeKeyDescriptionidINTPKAlert identifiertransaction_idINTFKRelated transactionrule_nameVARCHARRule that was triggeredreasonTEXTExplanation of alertalert_statusVARCHARCurrent alert statuscreated_atDATETIMEAlert creation timereviewed_atDATETIMEReview time

29. Reports Table

FieldTypeKeyDescriptionidINTPKReport identifierreport_typeVARCHARType of reportstart_dateDATETIMEReporting period startend_dateDATETIMEReporting period endgenerated_byINTFKUser who generated reportreport_dataJSON/TEXTReport informationcreated_atDATETIMEReport creation time

30. Database Relationships

The following relationships shall be implemented:

One user shall have many transactions.

One transaction may have one or more fraud alerts where multiple rules are recorded separately.

One user may generate multiple reports.

Each fraud alert shall reference the transaction that generated it.

Foreign key constraints shall be used to preserve referential integrity.

31. REST API Specification

The frontend shall communicate with the backend through REST endpoints.

Authentication

MethodEndpointPurposePOST/api/auth/registerRegister userPOST/api/auth/loginAuthenticate userPOST/api/auth/logoutEnd sessionGET/api/auth/meRetrieve authenticated user

Transactions

MethodEndpointPurposePOST/api/transactionsCreate transactionGET/api/transactionsRetrieve transactionsGET/api/transactions/{id}Retrieve transactionGET/api/transactions/searchSearch transactionsPUT/api/transactions/{id}Update transaction where permitted

Fraud Alerts

MethodEndpointPurposeGET/api/alertsRetrieve fraud alertsGET/api/alerts/{id}Retrieve specific alertPUT/api/alerts/{id}Update alert status

Analysis

MethodEndpointPurposeGET/api/analysis/summaryRetrieve transaction summaryGET/api/analysis/trendsRetrieve transaction trendsGET/api/analysis/by-typeGroup transactions by typeGET/api/analysis/by-locationGroup transactions by locationGET/api/analysis/fraudRetrieve fraud statistics

Reports

MethodEndpointPurposePOST/api/reports/generateGenerate reportGET/api/reportsRetrieve reportsGET/api/reports/{id}Retrieve report

The exact endpoint naming may be refined during implementation, but the frontend and backend shall use the same agreed API contract.

32. Example Transaction API Request

{
  "transaction_reference": "TXN-10001",
  "card_reference": "**** **** **** 1234",
  "amount": 250000,
  "transaction_type": "Online Purchase",
  "location": "Abuja",
  "transaction_date": "2026-09-08T14:30:00"
}

33. Example Transaction API Response

{
  "transaction_id": 10001,
  "status": "processed",
  "fraud_status": "suspicious",
  "alert_generated": true,
  "alert_id": 501,
  "triggered_rules": [
    "High Transaction Amount"
  ]
}

The React frontend shall use the returned information to update the interface and display the transaction result.

34. API Error Handling

The backend shall return meaningful HTTP status codes.

Examples:

CodeMeaning200Successful request201Resource successfully created400Invalid request401Authentication required or invalid403Access denied404Resource not found409Resource conflict422Validation error500Internal server error

The frontend shall display user-friendly messages rather than exposing raw backend errors.

35. Frontend State Handling

The React application shall provide states for:

Loading

Displayed while API requests are being processed.

Success

Displayed after an operation has been successfully completed.

Error

Displayed when an operation fails.

Empty

Displayed where a valid request returns no records.

Session Expired

Displayed when the authentication session has expired, followed by redirection to the login page.

36. Security Requirements

The system shall:

Require authentication for protected resources.

Hash user passwords before storage.

Avoid storing plain-text passwords.

Validate user input.

Validate transaction data.

Restrict protected API endpoints.

Apply role-based access where required.

Prevent unauthorised access to transaction records.

Avoid storing complete sensitive card information where unnecessary.

Handle authentication expiration.

Return controlled error messages.

37. Transaction Data Security

Because the project will involve credit card transaction information, only demonstration-safe card references shall be used.

The system shall not require real card numbers.

A representation such as:

**** **** **** 1234

or an internal card reference shall be used during testing.

38. Computational Logic

The backend fraud detection process shall follow the general algorithm:

START

Receive transaction

Validate transaction

IF validation fails
    Return validation error

Store transaction

Apply Rule 1

Apply Rule 2

Apply Rule 3

IF one or more rules are triggered
    Set fraud status = suspicious
    Create fraud alert
    Record triggered rules
ELSE
    Set fraud status = normal

Return transaction result

END

39. Pseudocode

FUNCTION process_transaction(transaction):

    validate(transaction)

    save(transaction)

    triggered_rules = []

    IF amount exceeds threshold:
        add "High Transaction Amount" to triggered_rules

    IF transaction frequency exceeds limit:
        add "High Transaction Frequency" to triggered_rules

    IF location is unusual:
        add "Unusual Location" to triggered_rules

    IF triggered_rules is not empty:
        transaction.status = "suspicious"

        create fraud alert
        record triggered rules

    ELSE:
        transaction.status = "normal"

    save transaction

    return transaction result

40. Complexity Consideration

The basic rule-based fraud detection process shall evaluate a fixed set of rules for each transaction. Where indexed database queries are used for historical transaction checks, searches shall be designed to avoid unnecessary scanning of the complete transaction table.

Transaction frequency checks shall therefore use appropriate fields such as:

user_id

card_reference

transaction_date

Database indexes shall be considered for these fields where they are frequently used for searching and analysis.

41. Testing Requirements

Testing shall be conducted at multiple levels.

Unit Testing

Individual backend functions shall be tested independently.

Examples:

Authentication.

Transaction validation.

Fraud rule evaluation.

Alert creation.

Analysis calculations.

Integration Testing

Communication between:

React
 ↓
FastAPI
 ↓
MySQL

shall be tested.

System Testing

The complete workflow shall be tested:

Login
 ↓
Record Transaction
 ↓
Monitor Transaction
 ↓
Apply Fraud Rules
 ↓
Generate Alert
 ↓
Display Alert
 ↓
Analyse Transaction
 ↓
Generate Report

User Acceptance Testing

The completed system shall be assessed against the functional requirements to determine whether the intended operations can be performed through the web interface.

42. Test Scenarios

At minimum, the following scenarios shall be tested:

TestExpected ResultValid loginUser shall be authenticatedInvalid loginAuthentication shall be rejectedValid transactionTransaction shall be recordedInvalid transactionValidation error shall be returnedHigh-value transactionTransaction shall be flaggedExcessive transaction frequencyTransaction shall be flaggedNormal transactionTransaction shall remain normalFraud alert generatedAlert shall appear in alert interfaceTransaction searchMatching records shall be returnedTransaction analysisCorrect summaries shall be displayedSession timeoutUser shall be required to authenticate again

43. Development Constraints

The implementation shall follow these constraints:

React shall be used for the frontend.

Python shall be used for the backend.

MySQL shall be used for persistent data storage.

The frontend and backend shall communicate through REST APIs.

Core fraud detection shall be implemented on the backend.

Fraud detection shall use predefined rules.

Real financial transactions shall not be processed.

Simulated or manually entered transaction data shall be used.

Sensitive card information shall not be unnecessarily stored.

Frontend components shall remain separate from backend business logic.

Database operations shall be performed through the backend.

Authentication shall be required for protected system functions.

Session timeout shall be supported.

The interface shall remain suitable for academic demonstration and evaluation.

44. Expected Final Application

The completed application shall provide the following overall experience:

                    USER
                      │
                      ↓
                LOGIN PAGE
                      │
                      ↓
                  DASHBOARD
                      │
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
   TRANSACTIONS     ALERTS       ANALYSIS
        │             │             │
        ↓             ↓             ↓
   Record/Search   Review       Charts/Reports
        │
        ↓
 TRANSACTION MONITORING
        │
        ↓
 FRAUD DETECTION RULES
        │
   ┌────┴────┐
   ↓         ↓
NORMAL    SUSPICIOUS
             │
             ↓
        FRAUD ALERT

The principal purpose of the implementation will therefore be demonstrated through the complete relationship between transaction recording, transaction monitoring, rule-based fraud detection, fraud alert generation, and transaction analysis.

45. Instructions for Lovable

The React frontend shall be developed according to the frontend requirements in this TRD.

Lovable shall:

Build the interface using React.

Create the pages and components specified.

Use mock data only during frontend development where the backend is not yet available.

Structure API service functions so that the mock data can later be replaced by the Python API.

Avoid implementing fraud detection logic in React.

Avoid implementing database operations in React.

Create protected routes for authenticated pages.

Implement loading, error, empty and timeout states.

Build dashboards and transaction visualisations.

Maintain a professional academic/software-project appearance.

Ensure that the frontend can consume REST API responses according to the API specification.

The frontend shall not invent additional core system functions that conflict with this TRD.

46. Instructions for Copilot

The Python backend shall be implemented according to the backend requirements in this TRD.

Copilot shall:

Implement the REST API.

Implement authentication.

Implement database models.

Implement database relationships.

Implement transaction processing.

Implement transaction monitoring.

Implement rule-based fraud detection.

Implement fraud alert generation.

Implement transaction searching.

Implement transaction analysis.

Implement reporting endpoints.

Implement validation.

Implement authentication expiration.

Implement appropriate error handling.

Keep fraud detection logic separate from API route definitions.

Keep database logic separate from presentation concerns.

Ensure API responses match the frontend contract.

The backend shall remain independent of React and shall expose the required functionality through REST endpoints.

47. Single Source of Truth

The following rules shall be treated as fixed project decisions unless deliberately changed during development:

AreaDecisionFrontendReactBackendPythonBackend FrameworkFastAPIDatabaseMySQLArchitectureThree-tierCommunicationREST APIFraud DetectionRule-basedTransaction DataSimulated/manualAuthenticationToken-basedAnalysisTransaction grouping, statistics and visualisationPrimary UserAdministrator/Fraud AnalystReal Payment ProcessingNot includedMachine LearningNot includedSession TimeoutRequired

This is the version I would give to Lovable and subsequently use as the specification for Copilot. The most important part is that both tools are now being given the same system boundary, database structure, API contract, fraud rules, and frontend/backend separation, so they will have much less room to interpret the project differently.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d6a375cd-737b-4168-876c-e77d799eedea).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
