---
description: Create or update the feature specification from a natural language feature description.
handoffs:
  - label: Build Technical Plan
    agent: speckit.plan
    prompt: Create a plan for the spec. I am building with...
  - label: Clarify Spec Requirements
    agent: speckit.clarify
    prompt: Clarify specification requirements
    send: true
tools: [execute/runInTerminal, edit/createFile, edit/createDirectory, edit/editFiles, todo]
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## CLI Tools

This CLI Tool is a custom helper library to assist you in the spec-driven development process. {SCRIPT} should be replaced with the actual script command:

```
bun /Users/cadenyoung/Developer/spec/src/index.ts
```

## Progress Tracking

You MUST use #tool:todo to create a progress checklist for this outline. Update it as you complete each step.

The steps should correspond to the outline as follows:

1. Create a GitHub issue
2. Create the spec file and branch
3. Build the specification
4. Update the spec file
5. Validate specification quality
6. Report completion results

## Outline

The text the user typed after `/speckit.specify` in the triggering message **is** the feature description. Assume you always have it available in this conversation even if `{ARGS}` appears literally below. Do not ask the user to repeat it unless they provided an empty command.

Given that feature description, do this:

1. **Use the spec CLI to create a GitHub issue for the feature**:

   a. **Generate a descriptive title** (less than 200 characters) for the issue:

      - Summarize the feature in a clear, concise title
      - Focus on the user value or problem being solved
      - Avoid technical jargon or implementation details
      - Examples:
        - "Add user authentication to secure the application"
        - "Integrate OAuth2 for improved API security"
        - "Create an analytics dashboard for better insights"
        - "Fix payment processing timeout to improve reliability"
   
   b. **Use the feature description as the issue body** without modification

   c. **Determine the issue type**:

      - If the feature description only indicates a bug fix and nothing else, use "fix"
      - For all other features, improvements, or new functionality, use "feature"

   d. **Run the command to create the issue**:

      ```zsh
      # Create a new issue in the GitHub repository using the provided title and body.
      {SCRIPT} create issue \
      --title "{descriptiveTitle}" \
      --type "{issueType}" \
      --body "{featureDescription}"
      ```

   e. **Read the command output** to extract the issue number and URL.
      
      - The output is a JSON object with `issueNumber` and `issueUrl` fields
   
   f. **If an error occurs, STOP immediately**: Instead:
   
      - Report the error to the user in the chat window with the message: "Error creating issue ({errorType}): {errorMessage}".
      - Wait for user guidance before proceeding.
   
   g. **Report the issue creation results** to the user in the chat window: "Created issue #{issueNumber}: {issueUrl}"

2. **Use the spec CLI to create the spec for the feature**:

   a. **Generate a concise slug** (2-4 words) for the branch:

      - Analyze the feature description and extract the most meaningful keywords
      - Create a 2-4 word short name that captures the essence of the feature
      - Use action-noun format when possible (e.g., "add-user-auth", "fix-payment-bug")
      - Preserve technical terms and acronyms (OAuth2, API, JWT, etc.)
      - Keep it concise but descriptive enough to understand the feature at a glance
      - Examples:
      - "I want to add user authentication" → "user-auth"
      - "Implement OAuth2 integration for the API" → "oauth2-api-integration"
      - "Create a dashboard for analytics" → "analytics-dashboard"
      - "Fix payment processing timeout bug" → "fix-payment-timeout"

   b. **Use the issue number from the previous step** without the hashtag (e.g., "123" not "#123") for the number flag

   c. **Use the issue type from the previous step** as an argument for the type flag.

   d. **Run the command to create the spec**:

      ```zsh
      # The command will create and checkout a new branch in the format `{issueType}/{issueNumber}-{slug}` (e.g., "feature/123-user-auth")
      # It will also generate a new spec file from the template and place it in `specs/{issueNumber}-{slug}/spec.md` (e.g., "specs/123-user-auth/spec.md")
      # Finally, it will add the new spec file to git staging for the created branch, commit it with a message referencing the issue number, and push the branch to the remote repository.
      {SCRIPT} create spec \
      --slug "{slug}" \
      --type "{issueType}" \
      --number {issueNumber} \
      ```

   e. **Read the command output** to extract the branch name, spec file path, and feature directory.

      - The output is a JSON object with `branchName`, `specFile`, and `featureDir` fields

   f. **If an error occurs, STOP immediately**: Even if the spec file was created, DO NOT continue the workflow. Instead:
   
      - Report the error to the user in the chat window with the message: "Error creating spec ({errorType}): {errorMessage}".
      - Wait for user guidance before proceeding.
   
   g. **Report the spec creation results** to the user in the chat window: "Created branch {branchName} with spec file at {specFile}"

3. Follow this execution flow:

    1. Parse user description from Input
       If empty: ERROR "No feature description provided"
    2. Extract key concepts from description
       Identify: actors, actions, data, constraints
    3. For unclear aspects:
       - Make informed guesses based on context and industry standards
       - Only mark with [NEEDS CLARIFICATION: specific question] if:
         - The choice significantly impacts feature scope or user experience
         - Multiple reasonable interpretations exist with different implications
         - No reasonable default exists
       - **LIMIT: Maximum 3 [NEEDS CLARIFICATION] markers total**
       - Prioritize clarifications by impact: scope > security/privacy > user experience > technical details
    4. Fill User Scenarios & Testing section
       If no clear user flow: ERROR "Cannot determine user scenarios"
    5. Generate Functional Requirements
       Each requirement must be testable
       Use reasonable defaults for unspecified details (document assumptions in Assumptions section)
    6. Define Success Criteria
       Create measurable, technology-agnostic outcomes
       Include both quantitative metrics (time, performance, volume) and qualitative measures (user satisfaction, task completion)
       Each criterion must be verifiable without implementation details
    7. Identify Key Entities (if data involved)
    8. Return: SUCCESS (spec ready for planning)

4. Write the specification to SPEC_FILE using the template structure, replacing placeholders with concrete details derived from the feature description (arguments) while preserving section order and headings.

5. **Specification Quality Validation**: After writing the initial spec, validate it against quality criteria:

   a. **Create Spec Quality Checklist**: Generate a checklist file at `FEATURE_DIR/checklists/requirements.md` using the checklist template structure with these validation items:

      ```markdown
      # Specification Quality Checklist: [FEATURE NAME]

      **Purpose**: Validate specification completeness and quality before proceeding to planning
      **Created**: [DATE]
      **Feature**: [Link to spec.md]

      ## Content Quality

      - [ ] No implementation details (languages, frameworks, APIs)
      - [ ] Focused on user value and business needs
      - [ ] Written for non-technical stakeholders
      - [ ] All mandatory sections completed

      ## Requirement Completeness

      - [ ] No [NEEDS CLARIFICATION] markers remain
      - [ ] Requirements are testable and unambiguous
      - [ ] Success criteria are measurable
      - [ ] Success criteria are technology-agnostic (no implementation details)
      - [ ] All acceptance scenarios are defined
      - [ ] Edge cases are identified
      - [ ] Scope is clearly bounded
      - [ ] Dependencies and assumptions identified

      ## Feature Readiness

      - [ ] All functional requirements have clear acceptance criteria
      - [ ] User scenarios cover primary flows
      - [ ] Feature meets measurable outcomes defined in Success Criteria
      - [ ] No implementation details leak into specification

      ## Notes

      - Items marked incomplete require spec updates before `/speckit.clarify` or `/speckit.plan`
      ```

   b. **Run Validation Check**: Review the spec against each checklist item:
      - For each item, determine if it passes or fails
      - Document specific issues found (quote relevant spec sections)

   c. **Handle Validation Results**:

      - **If all items pass**: Mark checklist complete and proceed to step 6

      - **If items fail (excluding [NEEDS CLARIFICATION])**:
        1. List the failing items and specific issues
        2. Update the spec to address each issue
        3. Re-run validation until all items pass (max 3 iterations)
        4. If still failing after 3 iterations, document remaining issues in checklist notes and warn user

      - **If [NEEDS CLARIFICATION] markers remain**:
        1. Extract all [NEEDS CLARIFICATION: ...] markers from the spec
        2. **LIMIT CHECK**: If more than 3 markers exist, keep only the 3 most critical (by scope/security/UX impact) and make informed guesses for the rest
        3. For each clarification needed (max 3), present options to user in this format:

           ```markdown
           ## Question [N]: [Topic]

           **Context**: [Quote relevant spec section]

           **What we need to know**: [Specific question from NEEDS CLARIFICATION marker]

           **Suggested Answers**:

           | Option | Answer | Implications |
           |--------|--------|--------------|
           | A      | [First suggested answer] | [What this means for the feature] |
           | B      | [Second suggested answer] | [What this means for the feature] |
           | C      | [Third suggested answer] | [What this means for the feature] |
           | Custom | Provide your own answer | [Explain how to provide custom input] |

           **Your choice**: _[Wait for user response]_
           ```

        4. **CRITICAL - Table Formatting**: Ensure markdown tables are properly formatted:
           - Use consistent spacing with pipes aligned
           - Each cell should have spaces around content: `| Content |` not `|Content|`
           - Header separator must have at least 3 dashes: `|--------|`
           - Test that the table renders correctly in markdown preview
        5. Number questions sequentially (Q1, Q2, Q3 - max 3 total)
        6. Present all questions together before waiting for responses
        7. Wait for user to respond with their choices for all questions (e.g., "Q1: A, Q2: Custom - [details], Q3: B")
        8. Update the spec by replacing each [NEEDS CLARIFICATION] marker with the user's selected or provided answer
        9. Re-run validation after all clarifications are resolved

   d. **Update Checklist**: After each validation iteration, update the checklist file with current pass/fail status

6. Report completion with issue number and url, branch name, spec file path, checklist results, and readiness for the next phase (`/speckit.clarify` or `/speckit.plan`).

**NOTE:** The script creates and checks out the new branch and initializes the spec file before writing.

## General Guidelines

## Quick Guidelines

- Focus on **WHAT** users need and **WHY**.
- Avoid HOW to implement (no tech stack, APIs, code structure).
- Written for business stakeholders, not developers.
- DO NOT create any checklists that are embedded in the spec. That will be a separate command.

### Section Requirements

- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation

When creating this spec from a user prompt:

1. **Make informed guesses**: Use context, industry standards, and common patterns to fill gaps
2. **Document assumptions**: Record reasonable defaults in the Assumptions section
3. **Limit clarifications**: Maximum 3 [NEEDS CLARIFICATION] markers - use only for critical decisions that:
   - Significantly impact feature scope or user experience
   - Have multiple reasonable interpretations with different implications
   - Lack any reasonable default
4. **Prioritize clarifications**: scope > security/privacy > user experience > technical details
5. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
6. **Common areas needing clarification** (only if no reasonable default exists):
   - Feature scope and boundaries (include/exclude specific use cases)
   - User types and permissions (if multiple conflicting interpretations possible)
   - Security/compliance requirements (when legally/financially significant)

**Examples of reasonable defaults** (don't ask about these):

- Data retention: Industry-standard practices for the domain
- Performance targets: Standard web/mobile app expectations unless specified
- Error handling: User-friendly messages with appropriate fallbacks
- Authentication method: Standard session-based or OAuth2 for web apps
- Integration patterns: Use project-appropriate patterns (REST/GraphQL for web services, function calls for libraries, CLI args for tools, etc.)

### Success Criteria Guidelines

Success criteria must be:

1. **Measurable**: Include specific metrics (time, percentage, count, rate)
2. **Technology-agnostic**: No mention of frameworks, languages, databases, or tools
3. **User-focused**: Describe outcomes from user/business perspective, not system internals
4. **Verifiable**: Can be tested/validated without knowing implementation details

**Good examples**:

- "Users can complete checkout in under 3 minutes"
- "System supports 10,000 concurrent users"
- "95% of searches return results in under 1 second"
- "Task completion rate improves by 40%"

**Bad examples** (implementation-focused):

- "API response time is under 200ms" (too technical, use "Users see results instantly")
- "Database can handle 1000 TPS" (implementation detail, use user-facing metric)
- "React components render efficiently" (framework-specific)
- "Redis cache hit rate above 80%" (technology-specific)
