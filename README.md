# Capstone Research Hub

This project provides a student and guide workflow for evidence-based capstone research. GitHub Pages serves the static dashboard. Google Sheets remains the controlled record of papers, milestones, and guide-student interactions.

## What is included

- A mobile-friendly dashboard with all five university stages and publication evidence built into each stage.
- Paper screening that checks for duplicate titles and source links before adding a record.
- A guide-interaction form for online or offline meetings.
- A Google Apps Script API that appends validated records to a protected spreadsheet.
- A GitHub Actions workflow for GitHub Pages deployment.

## Spreadsheet record design

| Tab | Purpose |
| --- | --- |
| Projects | Project ID, approved title, guide, research question, and project status. |
| Students | Student identity, email, role, and team. This controls application access. |
| Papers | Source metadata, legal link, source type, owner, screening status, and submitter. |
| Literature Review | Algorithm, dataset, metrics, results, limitations, gap, and guide approval. |
| Milestones | Deliverables, owners, due dates, evidence links, and guide approval. |
| Interactions | Online/offline guide meetings, feedback, action items, and completion status. |
| Action Items | Individual actions generated from guide interactions. |
| Paper Readiness | Four low-stress evidence gates: novelty, reproducible method, defensible results, and submission package. |

## Google Sheets connection

1. Open the created native Google Sheet and add the approved student and guide email addresses in the `Students` tab.
2. In that Google Sheet, open **Extensions → Apps Script**. Copy `apps-script/Code.gs` and `apps-script/appsscript.json` into the project.
3. Run `setupWorkbook` once from the Apps Script editor and authorize it.
4. Deploy as a web app that executes as the accessing user. Restrict access to the university Workspace domain or the approved account list.
5. In the GitHub repository, add the deployed web-app URL as the `GOOGLE_APPS_SCRIPT_URL` Actions secret. The deployment workflow writes it into the published site without committing a production configuration file.

Do not add credentials, service-account keys, paper PDFs, student personal data, or the production `config.js` to the repository.

## GitHub Pages deployment

1. Create a private repository and push this folder to its `main` branch.
2. In **Settings → Pages**, set Source to **GitHub Actions**.
3. The included workflow deploys each change to GitHub Pages.
4. Use a private organization/restricted access arrangement for the records backend. GitHub Pages must not contain personal or research-record data; all protected data stays in Google Sheets.

## Deadline-first publication plan

The university milestones are the primary plan. The tracker does not create a second, competing research workflow. Instead, it records the paper-quality evidence that belongs in each portal submission:

| University stage | Deadline | Publication-ready evidence recorded in the tracker |
| --- | --- | --- |
| Problem identification and literature review | 7 Oct 2026 | Approved question, search log, 30 journal + 10 conference sources, matrix, gap statement, and two venue options. |
| Methodology | 14 Oct 2026 | Design, data source/permission record, baselines, metrics, protocol, and contribution claim. |
| Result analysis | 10 Nov 2026 | Experiment log, baseline comparison, figures, error analysis, and a feasible robustness check. |
| Conclusion and first draft | 25 Nov 2026 | Complete draft, evidence-bound conclusion, citation audit, authorship contribution record, and guide review. |
| Presentation, viva and TRL/submission status | 5 Dec 2026 | Slides/viva evidence, reproducibility package, venue checklist, submission or TRL status, and guide sign-off. |

Record one short guide interaction at the end of each stage in `Interactions`; create only the resulting commitments in `Action Items`. This gives the faculty a complete guide–student record without asking students to duplicate their work.

## Team target

Each of the three teams should collectively screen 40 unique sources: 30 journal papers and 10 conference papers. Each student owns 20 source records. A source counts only after it has a legal link, relevance rationale, and review status. The plan makes a team submission-ready; acceptance and publication remain decisions of the selected journal or conference.
